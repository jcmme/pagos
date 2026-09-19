import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { currentMonthYear, monthRange } from "@/lib/dates";

export type QuickCategory = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  parentId: string | null;
};

export type QuickAccount = { id: string; name: string; type: string };

// Una combinación que la persona ya usó: es lo que permite capturar en dos
// toques en vez de recorrer el árbol de categorías cada vez.
export type QuickShortcut = {
  categoryId: string;
  categoryName: string;
  color: string;
  accountId: string | null;
  accountName: string | null;
  uses: number;
};

export type BudgetStatus = { categoryId: string; limit: number; spent: number };

export type QuickCaptureData = {
  categories: QuickCategory[];
  accounts: QuickAccount[];
  shortcuts: QuickShortcut[];
  budgets: BudgetStatus[];
};

const SHORTCUT_LOOKBACK_DAYS = 60;
const MAX_SHORTCUTS = 6;

export async function getQuickCaptureData(userId: string): Promise<QuickCaptureData> {
  const { month, year } = currentMonthYear();
  const { start, end } = monthRange(year, month);
  const since = new Date(Date.now() - SHORTCUT_LOOKBACK_DAYS * 86_400_000);

  const [categories, accounts, recent, budgets, spentByCategory] = await Promise.all([
    prisma.category.findMany({
      where: { archived: false },
      select: { id: true, name: true, color: true, icon: true, parentId: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.account.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId", "accountId"],
      where: {
        userId,
        kind: "EXPENSE",
        date: { gte: since },
        categoryId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: MAX_SHORTCUTS,
    }),
    prisma.budget.findMany({ where: { userId, month, year } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        kind: "EXPENSE",
        excludeFromStats: false,
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const spent = new Map(
    spentByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );

  return {
    categories,
    accounts,
    shortcuts: recent.flatMap((row) => {
      const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
      if (!category) return [];
      const account = row.accountId ? accountById.get(row.accountId) : undefined;
      return [
        {
          categoryId: category.id,
          categoryName: category.name,
          color: category.color,
          accountId: account?.id ?? null,
          accountName: account?.name ?? null,
          uses: row._count._all,
        },
      ];
    }),
    budgets: budgets.map((budget) => ({
      categoryId: budget.categoryId,
      limit: toNumber(budget.amount),
      spent: spent.get(budget.categoryId) ?? 0,
    })),
  };
}
