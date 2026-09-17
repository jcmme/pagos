import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { MONTH_NAMES_SHORT } from "@/lib/constants";

export type MonthlyTotal = {
  key: string;
  label: string;
  expenses: number;
  income: number;
};

// Totales mes a mes para ver la tendencia. Se arma la serie completa aunque
// algún mes no tenga movimientos: un hueco en el eje engaña más que un cero.
export async function getMonthlyTotals(
  userId: string,
  months = 6,
  now = new Date()
): Promise<MonthlyTotal[]> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      excludeFromStats: false,
      kind: { in: ["EXPENSE", "INCOME"] },
      date: { gte: start, lt: end },
    },
    select: { kind: true, amount: true, date: true },
  });

  const buckets = new Map<string, MonthlyTotal>();
  for (let i = 0; i < months; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    buckets.set(key, {
      key,
      label: MONTH_NAMES_SHORT[date.getUTCMonth()],
      expenses: 0,
      income: 0,
    });
  }

  for (const row of rows) {
    const key = `${row.date.getUTCFullYear()}-${row.date.getUTCMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const amount = toNumber(row.amount);
    if (row.kind === "EXPENSE") bucket.expenses += amount;
    else bucket.income += amount;
  }

  return [...buckets.values()];
}
