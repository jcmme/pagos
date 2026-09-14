import { prisma } from "@/lib/prisma";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { MonthNav } from "@/components/layout/MonthNav";
import { ExpensesClient } from "./ExpensesClient";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const fallback = currentMonthYear();
  const month = Number(params.month) || fallback.month;
  const year = Number(params.year) || fallback.year;
  const { start, end } = monthRange(year, month);

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Gastos</h1>
        <MonthNav basePath="/gastos" month={month} year={year} />
      </div>
      <ExpensesClient
        expenses={JSON.parse(JSON.stringify(expenses))}
        categories={categories}
        total={total}
      />
    </div>
  );
}
