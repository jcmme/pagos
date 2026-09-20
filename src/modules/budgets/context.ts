import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { resolveIncome, type IncomeMode, type IncomeSource } from "@/modules/income/resolve";

// Los dos datos que hacen falta para resolver cualquier presupuesto del mes:
// cuánto hay para gastar y qué categoría se queda con el sobrante. Vive aquí
// porque lo necesitan cinco lugares (la pantalla de presupuestos, el resumen,
// la hoja de captura, los avisos y el score de salud) y ninguno debería volver
// a deducirlo por su cuenta.

export type BudgetContext = {
  /** Lo que hay para gastar, o null si falta capturarlo. */
  income: number | null;
  source: IncomeSource;
  mode: IncomeMode;
  /** El sueldo base guardado, exista o no un ingreso de este mes. */
  baseIncome: number | null;
  /** La cifra capturada para este mes, si existe. */
  monthAmount: number | null;
  savingsCategoryId: string | null;
};

export async function getBudgetContext(
  userId: string,
  month: number,
  year: number
): Promise<BudgetContext> {
  const [user, savings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        incomeMode: true,
        monthlyIncome: true,
        incomes: { where: { month, year }, select: { amount: true } },
      },
    }),
    prisma.category.findFirst({ where: { savings: true }, select: { id: true } }),
  ]);

  const mode = (user?.incomeMode ?? "VARIABLE") as IncomeMode;
  const baseIncome = user?.monthlyIncome != null ? toNumber(user.monthlyIncome) : null;
  const { amount, source } = resolveIncome(mode, user?.monthlyIncome, user?.incomes[0]);

  const row = user?.incomes[0];

  return {
    income: amount,
    source,
    mode,
    baseIncome,
    monthAmount: row ? toNumber(row.amount) : null,
    savingsCategoryId: savings?.id ?? null,
  };
}
