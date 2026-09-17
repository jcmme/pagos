import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serialize } from "@/lib/utils";
import { isGeminiEnabled } from "@/lib/ai/gemini";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const userId = await requireUserId();
  const [imports, accounts] = await Promise.all([
    prisma.statementImport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        account: { select: { name: true } },
        _count: { select: { rows: true } },
      },
    }),
    prisma.account.findMany({
      where: { userId, archived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  const pendingCounts = await prisma.stagedTransaction.groupBy({
    by: ["importId"],
    where: { status: { in: ["PENDING", "DUPLICATE"] }, import: { userId } },
    _count: { _all: true },
  });

  const pendingByImport = Object.fromEntries(
    pendingCounts.map((row) => [row.importId, row._count._all])
  );

  return (
    <ImportClient
      imports={serialize(imports)}
      accounts={serialize(accounts)}
      pendingByImport={pendingByImport}
      pdfEnabled={isGeminiEnabled()}
    />
  );
}
