import { prisma } from "@/lib/prisma";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { MonthNav } from "@/components/layout/MonthNav";
import { BudgetsClient } from "./BudgetsClient";

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

  const [categories, budgets, expensesByCategory] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.budget.findMany({ where: { month, year } }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const spentByCategory = new Map(
    expensesByCategory.map((e) => [e.categoryId, Number(e._sum.amount ?? 0)])
  );

  const rows = categories.map((cat) => {
    const budget = budgets.find((b) => b.categoryId === cat.id) ?? null;
    return {
      category: cat,
      budget: budget ? { ...budget, amount: budget.amount.toString() } : null,
      spent: spentByCategory.get(cat.id) ?? 0,
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
