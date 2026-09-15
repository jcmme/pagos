import { prisma } from "@/lib/prisma";
import { serialize, toNumber } from "@/lib/utils";
import { buildTransactionWhere, parseFilterParams } from "@/modules/transactions/query";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 150;

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filter = parseFilterParams(params);
  const where = buildTransactionWhere(filter);

  const [transactions, categories, accounts, tags, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: { include: { parent: true } }, account: true, tags: true },
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.category.findMany({
      where: { archived: false },
      include: { parent: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.account.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.groupBy({ by: ["kind"], where, _sum: { amount: true } }),
  ]);

  const sumOf = (kind: string) =>
    toNumber(totals.find((row) => row.kind === kind)?._sum.amount ?? 0);

  return (
    <TransactionsClient
      transactions={serialize(transactions)}
      categories={serialize(categories)}
      accounts={serialize(accounts)}
      tags={serialize(tags)}
      totals={{ expenses: sumOf("EXPENSE"), income: sumOf("INCOME") }}
      filter={filter}
      truncated={transactions.length === PAGE_SIZE}
    />
  );
}
