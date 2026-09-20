import { toNumber } from "@/lib/utils";

// El límite de un presupuesto dejó de ser un número que se lee de la fila.
//
// Hay dos formas de definirlo —monto fijo o porcentaje del ingreso— y una de
// ellas depende de un dato que puede faltar: el ingreso del mes. Además, la
// categoría de ahorro se queda con lo que nadie repartió, así que su límite
// depende de lo que sumen todas las demás. Por eso se resuelve **el mes
// completo de una vez** y no una fila suelta: mirando un solo presupuesto es
// imposible saber cuánto le toca a Ahorro.
//
// `null` no es cero: significa "en pausa, falta capturar el ingreso". Quien lo
// reciba debe esconder la barra, no pintarla vacía.

/** Lo mínimo que hace falta de un Budget. Acepta Decimal de Prisma o el
 *  string que queda después de serialize(). */
export type BudgetLike = {
  categoryId: string;
  amount: number | string | { toString(): string } | null;
  percent: number | string | { toString(): string } | null;
  adjustment?: number | string | { toString(): string } | null;
};

export type MonthAllocation = {
  /** categoryId → límite en pesos, o null si falta el ingreso. */
  limits: Map<string, number | null>;
  /** Suma de los porcentajes asignados a mano, incluido el de Ahorro. */
  assignedPercent: number;
  /** Lo que nadie repartió. Cero si se asignó el 100% o si se pasaron. */
  leftoverPercent: number;
  /** El sobrante en pesos, o null si falta el ingreso. */
  leftoverAmount: number | null;
  /** Repartieron más del 100%: es el único error del repartidor. */
  over: boolean;
  /** Hay sobrante pero ninguna categoría marcada como ahorro. */
  unassigned: boolean;
};

function num(value: BudgetLike["amount"] | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resuelve los límites de un mes.
 *
 * @param income  Lo que hay para gastar, o null si no se capturó.
 * @param savingsCategoryId  La categoría marcada como ahorro, o null si no hay.
 */
export function resolveMonth(
  budgets: BudgetLike[],
  income: number | null,
  savingsCategoryId: string | null
): MonthAllocation {
  const assignedPercent = budgets.reduce((sum, budget) => {
    const percent = num(budget.percent);
    return percent === null ? sum : sum + percent;
  }, 0);

  const over = assignedPercent > 100;
  // Pasarse no genera sobrante: el repartidor pide corregir antes.
  const leftoverPercent = over ? 0 : round2(100 - assignedPercent);

  const savings =
    savingsCategoryId !== null
      ? budgets.find((budget) => budget.categoryId === savingsCategoryId)
      : undefined;
  // El sobrante solo tiene dónde caer si la categoría de ahorro reparte por
  // porcentaje. Con un monto fijo, o sin categoría marcada, queda sin repartir
  // y se dice en pantalla en vez de perderse en silencio.
  const savingsTakesLeftover = !!savings && num(savings.percent) !== null;

  const limits = new Map<string, number | null>();

  for (const budget of budgets) {
    const adjustment = num(budget.adjustment) ?? 0;
    const fixed = num(budget.amount);

    if (fixed !== null) {
      limits.set(budget.categoryId, round2(fixed + adjustment));
      continue;
    }

    const percent = num(budget.percent);
    if (percent === null || income === null) {
      limits.set(budget.categoryId, null);
      continue;
    }

    // La regla que pidió el usuario: lo que no repartas se suma a Ahorro,
    // aunque ya le hubieras asignado un porcentaje. Se calcula aquí y no se
    // guarda: si mañana baja el porcentaje de Ocio, el ahorro sube solo.
    const effective =
      savingsTakesLeftover && budget.categoryId === savingsCategoryId
        ? percent + leftoverPercent
        : percent;

    limits.set(budget.categoryId, round2((income * effective) / 100 + adjustment));
  }

  return {
    limits,
    assignedPercent: round2(assignedPercent),
    leftoverPercent,
    leftoverAmount: income === null ? null : round2((income * leftoverPercent) / 100),
    over,
    unassigned: leftoverPercent > 0 && !savingsTakesLeftover,
  };
}

/** El contrato corto para quien solo necesita los límites. */
export function resolveBudgets(
  budgets: BudgetLike[],
  income: number | null,
  savingsCategoryId: string | null
): Map<string, number | null> {
  return resolveMonth(budgets, income, savingsCategoryId).limits;
}

// Los porcentajes llegan con dos decimales y multiplicar en punto flotante deja
// colas de centavos: 11500 * 33.33 / 100 da 3832.9499999999994.
function round2(value: number) {
  return Math.round(value * 100) / 100;
}
