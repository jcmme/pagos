import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { getAccountsWithBalances, liquidBalance } from "@/modules/accounts/balance";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { monthsUntil } from "@/modules/goals/schedule";

export type AvailableToSpend = {
  available: boolean;
  reason?: string;
  liquid: number;
  upcomingPayments: number;
  goalReserves: number;
  amount: number;
  /** Fecha del próximo ingreso fijo, si hay alguno configurado. */
  nextIncomeAt: Date | null;
  horizonDays: number;
};

// Cuánto puede gastar hoy sin quedarse corto: el saldo líquido menos lo que ya
// está comprometido antes de que entre el siguiente ingreso.
export async function getAvailableToSpend(now = new Date()): Promise<AvailableToSpend> {
  const [accounts, fixedPayments, goals] = await Promise.all([
    getAccountsWithBalances(),
    prisma.fixedPayment.findMany({ where: { active: true } }),
    prisma.savingsGoal.findMany({
      where: { archived: false },
      include: { contributions: true },
    }),
  ]);

  const liquid = liquidBalance(accounts);

  if (accounts.length === 0) {
    return {
      available: false,
      reason: "Agrega al menos una cuenta con su saldo para calcular esto.",
      liquid: 0,
      upcomingPayments: 0,
      goalReserves: 0,
      amount: 0,
      nextIncomeAt: null,
      horizonDays: 0,
    };
  }

  // El horizonte llega hasta el próximo ingreso fijo. Sin ingresos fijos
  // configurados, se usa el fin de mes como aproximación.
  const incomes = fixedPayments.filter((payment) => payment.kind === "INCOME");
  const nextIncome = incomes
    .map((payment) => computeNextDueDate(payment, now))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const horizonEnd = nextIncome ?? endOfMonth;
  const horizonDays = Math.max(0, daysUntil(horizonEnd, now));

  const upcomingPayments = fixedPayments
    .filter((payment) => payment.kind === "EXPENSE")
    .filter((payment) => {
      const days = daysUntil(computeNextDueDate(payment, now), now);
      return days >= 0 && days <= horizonDays;
    })
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  // De las metas se aparta solo lo que toca ahorrar en este periodo, no el
  // objetivo completo: reservar los 90 mil de un fondo de emergencia dejaría
  // el disponible en cero desde el primer día, que no ayuda a decidir nada.
  const goalReserves = goals.reduce((sum, goal) => {
    const saved = goal.contributions.reduce(
      (acc, contribution) => acc + toNumber(contribution.amount),
      0
    );
    const remaining = Math.max(0, toNumber(goal.targetAmount) - saved);
    if (remaining === 0) return sum;

    const months = monthsUntil(goal.targetDate, now);
    // Sin fecha objetivo no hay ritmo que exigir, así que no se aparta nada.
    if (!months) return sum;

    return sum + remaining / months;
  }, 0);

  // Aun así se descuenta solo hasta donde alcanza, para no dejar el
  // disponible artificialmente en negativo.
  const reserveApplied = Math.min(goalReserves, Math.max(0, liquid - upcomingPayments));

  return {
    available: true,
    liquid,
    upcomingPayments,
    goalReserves: reserveApplied,
    amount: liquid - upcomingPayments - reserveApplied,
    nextIncomeAt: nextIncome ?? null,
    horizonDays,
  };
}
