import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { serialize, toNumber } from "@/lib/utils";
import { MonthNav } from "@/components/layout/MonthNav";
import { BudgetsClient } from "./BudgetsClient";

export const dynamic = "force-dynamic";

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const fallback = currentMonthYear();
  const month = Number(params.month) || fallback.month;
  const year = Number(params.year) || fallback.year;
  const { start, end } = monthRange(year, month);

  const userId = await requireUserId();
  const [categories, budgets, spentByCategory] = await Promise.all([
    prisma.category.findMany({
      where: { archived: false },
      include: { parent: { include: { parent: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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

  const spent = new Map(
    spentByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );

  // El gasto de una subcategoría también cuenta para el presupuesto de su
  // categoría padre: si defines un límite a "Comida", debe incluir "Súper".
  const rows = categories.map((category) => {
    const ownSpent = spent.get(category.id) ?? 0;
    const childrenSpent = category.parentId
      ? 0
      : categories
          .filter((other) => other.parentId === category.id)
          .reduce((sum, child) => sum + (spent.get(child.id) ?? 0), 0);

    const budget = budgets.find((item) => item.categoryId === category.id) ?? null;

    return {
      category: serialize(category),
      budget: budget ? { id: budget.id, amount: budget.amount.toString() } : null,
      spent: ownSpent + childrenSpent,
    };
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Presupuestos</h1>
        <MonthNav basePath="/presupuestos" month={month} year={year} />
      </div>
      <BudgetsClient rows={rows} month={month} year={year} />
    </div>
  );
}
