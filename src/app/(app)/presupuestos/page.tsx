import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { serialize, toNumber } from "@/lib/utils";
import { MonthNav } from "@/components/layout/MonthNav";
import { getBudgetContext } from "@/modules/budgets/context";
import { resolveMonth } from "@/modules/budgets/limit";
import { BudgetsClient } from "./BudgetsClient";
import { IncomeCard } from "./IncomeCard";
import { Allocator, type AllocRow } from "./Allocator";

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
  const [categories, budgets, spentByCategory, context] = await Promise.all([
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
    getBudgetContext(userId, month, year),
  ]);

  const spent = new Map(
    spentByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );

  // El límite ya no se lee de la fila: un presupuesto por porcentaje depende del
  // ingreso del mes, y el de ahorro depende de lo que sumen todos los demás.
  const allocation = resolveMonth(budgets, context.income, context.savingsCategoryId);

  // El gasto de una subcategoría también cuenta para el presupuesto de su
  // categoría padre: si defines un límite a "Comida", debe incluir "Súper".
  const spentOf = (categoryId: string, isRoot: boolean) => {
    const own = spent.get(categoryId) ?? 0;
    if (!isRoot) return own;
    return (
      own +
      categories
        .filter((other) => other.parentId === categoryId)
        .reduce((sum, child) => sum + (spent.get(child.id) ?? 0), 0)
    );
  };

  const budgetOf = (categoryId: string) =>
    budgets.find((item) => item.categoryId === categoryId) ?? null;

  // El repartidor trabaja sobre las raíces, que es como lo describió el
  // usuario: los porcentajes se reparten entre las categorías principales.
  const allocRows: AllocRow[] = categories
    .filter((category) => !category.parentId)
    .map((category) => {
      const budget = budgetOf(category.id);
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        savings: category.savings,
        percent: budget?.percent != null ? toNumber(budget.percent) : null,
        fixed: budget?.amount != null ? toNumber(budget.amount) : null,
        spent: spentOf(category.id, true),
      };
    });

  // La lista por monto fijo se queda con las subcategorías y con cualquier raíz
  // que ya tuviera un monto: así lo de antes sigue editable —y borrable— sin
  // duplicar el control de las raíces que ya reparten por porcentaje.
  const rows = categories
    .filter((category) => category.parentId !== null || budgetOf(category.id)?.amount != null)
    .map((category) => {
      const budget = budgetOf(category.id);
      return {
        category: serialize(category),
        budget:
          budget && budget.amount != null
            ? { id: budget.id, amount: budget.amount.toString() }
            : null,
        limit: allocation.limits.get(category.id) ?? null,
        spent: spentOf(category.id, category.parentId === null),
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Presupuestos</h1>
        <MonthNav basePath="/presupuestos" month={month} year={year} />
      </div>

      <IncomeCard
        month={month}
        year={year}
        mode={context.mode}
        baseIncome={context.baseIncome}
        monthAmount={context.monthAmount}
        income={context.income}
        source={context.source}
      />

      {allocRows.length > 0 && (
        <Allocator
          rows={allocRows}
          month={month}
          year={year}
          income={context.income}
          hasSavings={context.savingsCategoryId !== null}
        />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-[15px] font-medium text-(--foreground-muted)">
          Por monto fijo
        </h2>
        <BudgetsClient rows={rows} month={month} year={year} />
      </div>
    </div>
  );
}
