import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { DebtsClient } from "./DebtsClient";

export const dynamic = "force-dynamic";

export default async function DeudasPage() {
  const userId = await requireUserId();
  const debts = await prisma.debt.findMany({
    where: { userId },
    include: { payments: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Deudas</h1>
      <DebtsClient debts={JSON.parse(JSON.stringify(debts))} />
    </div>
  );
}
