import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { getAccountsWithBalances, liquidBalance } from "@/modules/accounts/balance";
import {
  computeNextDueDate,
  daysUntil,
  isPaidForCycle,
} from "@/modules/fixed-payments/next-due-date";
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
// `cache()` por coherencia con las otras métricas: si dos partes de la misma
// pantalla lo piden, se calcula una vez.
export const getAvailableToSpend = cache(async function getAvailableToSpend(
  userId: string,
  now = new Date()
): Promise<AvailableToSpend> {
  const [accounts, fixedPayments, goals] = await Promise.all([
    getAccountsWithBalances(userId),
    prisma.fixedPayment.findMany({ where: { userId, active: true } }),
    prisma.savingsGoal.findMany({
      where: { userId, archived: false },
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

  // El horizonte llega hasta el PRÓXIMO ingreso fijo, y "próximo" tiene que ser
  // estrictamente posterior a hoy.
  //
  // `computeNextDueDate` devuelve hoy mismo cuando el pago vence hoy, así que
  // el día de la quincena el horizonte medía cero días y el filtro de abajo
  // dejaba fuera TODOS los pagos del periodo: la app decía que había 24,000
  // disponibles con la renta de 12,000 a dos días, justo el día en que más se
  // gasta. Se busca desde mañana para saltar el ingreso de hoy.
  const incomes = fixedPayments.filter((payment) => payment.kind === "INCOME");
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const nextIncome = incomes
    .map((payment) => computeNextDueDate(payment, tomorrow))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const horizonEnd = nextIncome ?? endOfMonth;
  const horizonDays = Math.max(0, daysUntil(horizonEnd, now));

  // Cuántas veces cae un pago dentro del horizonte, no si cae.
  //
  // Antes se contaba una sola vez la próxima ocurrencia, así que un pago
  // semanal de 800 con un horizonte de 28 días reservaba 800 en vez de 3,200 y
  // el disponible quedaba 2,400 por encima de lo real. Los mensuales y anuales
  // siguen cayendo una vez dentro de un horizonte de quincena o mes, así que
  // para ellos el resultado no cambia.
  const occurrencesInHorizon = (
    payment: { frequency: "MONTHLY" | "WEEKLY" | "YEARLY"; dueDay: number; dueMonth: number | null }
  ) => {
    const first = daysUntil(computeNextDueDate(payment, now), now);
    if (first < 0 || first > horizonDays) return 0;
    if (payment.frequency !== "WEEKLY") return 1;
    return Math.floor((horizonDays - first) / 7) + 1;
  };

  const upcomingPayments = fixedPayments
    .filter((payment) => payment.kind === "EXPENSE")
    // Lo ya marcado como pagado no se vuelve a apartar: el movimiento del pago
    // ya bajó el saldo, así que reservarlo otra vez lo descuenta dos veces.
    .filter((payment) => !isPaidForCycle(payment, now))
    .reduce(
      (sum, payment) => sum + toNumber(payment.amount) * occurrencesInHorizon(payment),
      0
    );

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
});
