import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORAL: endpoint de diagnóstico para localizar el 500 que solo ocurre en
// producción. Corre por separado cada consulta sospechosa y devuelve el error
// real, que Next oculta en producción. Se elimina en cuanto se identifique.
export const dynamic = "force-dynamic";

async function probe(name: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    return { name, ok: true, sample: JSON.stringify(result).slice(0, 300) };
  } catch (error) {
    return {
      name,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 6).join("\n") : undefined,
    };
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.SETUP_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const results = [
    await probe("count", () => prisma.transaction.count()),
    await probe("findMany simple", () => prisma.transaction.findMany({ take: 3 })),
    await probe("groupBy kind", () =>
      prisma.transaction.groupBy({ by: ["kind"], _sum: { amount: true } })
    ),
    await probe("groupBy kind con where", () =>
      prisma.transaction.groupBy({
        by: ["kind"],
        where: {
          date: { gte: monthStart, lt: nextMonth },
          excludeFromStats: false,
          kind: { in: ["EXPENSE", "INCOME"] },
        },
        _sum: { amount: true },
      })
    ),
    await probe("groupBy categoryId", () =>
      prisma.transaction.groupBy({ by: ["categoryId"], _sum: { amount: true } })
    ),
    await probe("groupBy accountId+kind", () =>
      prisma.transaction.groupBy({
        by: ["accountId", "kind"],
        where: { accountId: { not: null } },
        _sum: { amount: true },
      })
    ),
    await probe("category essential", () =>
      prisma.category.findMany({ where: { essential: true }, select: { id: true } })
    ),
    await probe("insightDismissal", () => prisma.insightDismissal.findMany()),
    await probe("savingsGoal", () =>
      prisma.savingsGoal.findMany({ include: { contributions: true } })
    ),
    await probe("findMany con includes", () =>
      prisma.transaction.findMany({
        include: { category: { include: { parent: true } }, account: true, tags: true },
        take: 5,
      })
    ),
  ];

  return NextResponse.json({ results });
}
