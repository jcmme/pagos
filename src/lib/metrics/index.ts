import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { HEALTH_TARGETS, HEALTH_WEIGHTS } from "@/lib/constants";
import { getAccountsWithBalances, liquidBalance } from "@/modules/accounts/balance";
import { clampScore, unavailable, type Metric } from "./types";

export type HealthReport = {
  score: number;
  /** true cuando algún pilar no pudo calcularse y el score se renormalizó. */
  partial: boolean;
  /**
   * false mientras no haya movimientos suficientes para que el score
   * signifique algo. Con dos movimientos cualquiera saca 100.
   */
  enoughData: boolean;
  transactionCount: number;
  savingsRate: Metric;
  emergencyFund: Metric;
  debtToIncome: Metric;
  budgetAdherence: Metric;
  netWorth: { assets: number; liabilities: number; total: number };
  cashFlow: { income: number; expenses: number; net: number };
  monthlyEssentials: number;
};

const MONTHS_OF_HISTORY = 6;
// Por debajo de esto el score es ruido: con dos movimientos la tasa de ahorro
// sale del 90% y todo marca perfecto.
const MIN_TRANSACTIONS_FOR_SCORE = 10;

export async function getHealthReport(now = new Date()): Promise<HealthReport> {
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - MONTHS_OF_HISTORY, 1)
  );
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [accounts, history, monthTotals, debts, budgets, monthByCategory, essentialCategories] =
    await Promise.all([
      getAccountsWithBalances(),
      // Las transferencias nunca cuentan como gasto ni ingreso: solo mueven
      // dinero entre cuentas propias.
      prisma.transaction.groupBy({
        by: ["kind"],
        where: {
          date: { gte: since, lt: nextMonth },
          excludeFromStats: false,
          kind: { in: ["EXPENSE", "INCOME"] },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["kind"],
        where: {
          date: { gte: monthStart, lt: nextMonth },
          excludeFromStats: false,
          kind: { in: ["EXPENSE", "INCOME"] },
        },
        _sum: { amount: true },
      }),
      prisma.debt.findMany({ include: { payments: true } }),
      prisma.budget.findMany({
        where: { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          date: { gte: monthStart, lt: nextMonth },
          kind: "EXPENSE",
          excludeFromStats: false,
        },
        _sum: { amount: true },
      }),
      prisma.category.findMany({ where: { essential: true }, select: { id: true } }),
    ]);

  const transactionCount = await prisma.transaction.count({
    where: { date: { gte: since, lt: nextMonth }, excludeFromStats: false },
  });

  const sumOf = (rows: typeof history, kind: string) =>
    toNumber(rows.find((row) => row.kind === kind)?._sum.amount ?? 0);

  const historyIncome = sumOf(history, "INCOME");
  const historyExpenses = sumOf(history, "EXPENSE");
  const monthIncome = sumOf(monthTotals, "INCOME");
  const monthExpenses = sumOf(monthTotals, "EXPENSE");

  // Se promedia sobre los meses que realmente tienen datos, no sobre 6 fijos,
  // para que un usuario nuevo no vea un promedio artificialmente bajo.
  const monthsWithData = Math.max(
    1,
    Math.min(MONTHS_OF_HISTORY + 1, now.getUTCMonth() + 1 - since.getUTCMonth() + 1)
  );

  const essentialIds = new Set(essentialCategories.map((category) => category.id));
  const monthlyEssentials =
    monthByCategory
      .filter((row) => row.categoryId && essentialIds.has(row.categoryId))
      .reduce((sum, row) => sum + toNumber(row._sum.amount ?? 0), 0) || monthExpenses;

  // --- Tasa de ahorro -------------------------------------------------------
  const savingsRate: Metric =
    historyIncome > 0
      ? {
          available: true,
          value: (historyIncome - historyExpenses) / historyIncome,
          target: HEALTH_TARGETS.savingsRate,
          score: clampScore(
            ((historyIncome - historyExpenses) / historyIncome / HEALTH_TARGETS.savingsRate) * 100
          ),
        }
      : unavailable(
          "Registra tus ingresos para calcular cuánto estás ahorrando.",
          HEALTH_TARGETS.savingsRate
        );

  // --- Fondo de emergencia --------------------------------------------------
  const liquid = liquidBalance(accounts);
  const avgEssentials = monthlyEssentials > 0 ? monthlyEssentials : historyExpenses / monthsWithData;

  const emergencyFund: Metric =
    accounts.length > 0 && avgEssentials > 0
      ? {
          available: true,
          value: liquid / avgEssentials,
          target: HEALTH_TARGETS.emergencyMonths,
          score: clampScore((liquid / avgEssentials / HEALTH_TARGETS.emergencyMonths) * 100),
        }
      : unavailable(
          accounts.length === 0
            ? "Agrega tus cuentas y su saldo para saber cuántos meses aguantas."
            : "Registra tus gastos esenciales para calcular tu fondo de emergencia.",
          HEALTH_TARGETS.emergencyMonths
        );

  // --- Deuda sobre ingreso --------------------------------------------------
  const outstandingDebt = debts
    .filter((debt) => debt.type === "OWE")
    .reduce((sum, debt) => {
      const paid = debt.payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
      return sum + Math.max(0, toNumber(debt.totalAmount) - paid);
    }, 0);

  const avgMonthlyIncome = historyIncome / monthsWithData;
  // Aproximación razonable sin tabla de amortización: se asume que la deuda se
  // liquidaría en 12 meses.
  const estimatedMonthlyDebt = outstandingDebt / 12;

  const debtToIncome: Metric =
    avgMonthlyIncome > 0
      ? {
          available: true,
          value: estimatedMonthlyDebt / avgMonthlyIncome,
          target: HEALTH_TARGETS.maxDebtToIncome,
          score: clampScore(
            (1 - estimatedMonthlyDebt / avgMonthlyIncome / HEALTH_TARGETS.maxDebtToIncome) * 100
          ),
        }
      : unavailable(
          "Registra tus ingresos para medir qué tanto pesa tu deuda.",
          HEALTH_TARGETS.maxDebtToIncome
        );

  // --- Cumplimiento de presupuesto -----------------------------------------
  const spentByCategory = new Map(
    monthByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );
  const withinBudget = budgets.filter(
    (budget) => (spentByCategory.get(budget.categoryId) ?? 0) <= toNumber(budget.amount)
  ).length;

  const budgetAdherence: Metric =
    budgets.length > 0
      ? {
          available: true,
          value: withinBudget / budgets.length,
          target: 1,
          score: clampScore((withinBudget / budgets.length) * 100),
        }
      : unavailable("Define presupuestos por categoría para medir tu disciplina.", 1);

  // --- Score compuesto ------------------------------------------------------
  const pillars: Array<[Metric, number]> = [
    [savingsRate, HEALTH_WEIGHTS.savingsRate],
    [emergencyFund, HEALTH_WEIGHTS.emergencyFund],
    [debtToIncome, HEALTH_WEIGHTS.debtToIncome],
    [budgetAdherence, HEALTH_WEIGHTS.budgetAdherence],
  ];

  const usable = pillars.filter(([metric]) => metric.available);
  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const score =
    totalWeight > 0
      ? clampScore(
          usable.reduce((sum, [metric, weight]) => sum + metric.score * weight, 0) / totalWeight
        )
      : 0;

  const assets = accounts
    .filter((account) => account.includeInNetWorth && !account.archived && account.balance > 0)
    .reduce((sum, account) => sum + account.balance, 0);
  const negativeBalances = accounts
    .filter((account) => account.includeInNetWorth && !account.archived && account.balance < 0)
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);

  return {
    score,
    partial: usable.length < pillars.length,
    enoughData: transactionCount >= MIN_TRANSACTIONS_FOR_SCORE,
    transactionCount,
    savingsRate,
    emergencyFund,
    debtToIncome,
    budgetAdherence,
    netWorth: {
      assets,
      liabilities: outstandingDebt + negativeBalances,
      total: assets - outstandingDebt - negativeBalances,
    },
    cashFlow: {
      income: monthIncome,
      expenses: monthExpenses,
      net: monthIncome - monthExpenses,
    },
    monthlyEssentials: avgEssentials,
  };
}
