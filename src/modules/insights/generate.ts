import { prisma } from "@/lib/prisma";
import { toNumber, formatCurrency } from "@/lib/utils";
import { monthRange, shiftMonth, MONTH_NAMES } from "@/lib/dates";

export type Insight = {
  /** Estable entre ejecuciones para poder descartarlo permanentemente. */
  key: string;
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  detail: string;
  href?: string;
};

// Umbral de cambio mes contra mes que vale la pena señalar. Por debajo es
// ruido normal de cualquier presupuesto.
const CHANGE_THRESHOLD = 0.3;

export async function generateInsights(now = new Date()): Promise<Insight[]> {
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const current = monthRange(year, month);
  const prev = shiftMonth(month, year, -1);
  const previous = monthRange(prev.year, prev.month);

  const [currentByCategory, previousByCategory, categories, budgets, subscriptions, dismissed] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          kind: "EXPENSE",
          excludeFromStats: false,
          date: { gte: current.start, lt: current.end },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          kind: "EXPENSE",
          excludeFromStats: false,
          date: { gte: previous.start, lt: previous.end },
        },
        _sum: { amount: true },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.budget.findMany({ where: { month, year }, include: { category: true } }),
      prisma.subscription.findMany({ where: { status: "DETECTED" } }),
      prisma.insightDismissal.findMany({ select: { key: true } }),
    ]);

  const dismissedKeys = new Set(dismissed.map((row) => row.key));
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const previousTotals = new Map(
    previousByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );

  const insights: Insight[] = [];

  // --- Cambios fuertes contra el mes pasado --------------------------------
  for (const row of currentByCategory) {
    if (!row.categoryId) continue;
    const name = names.get(row.categoryId);
    if (!name) continue;

    const nowTotal = toNumber(row._sum.amount ?? 0);
    const prevTotal = previousTotals.get(row.categoryId) ?? 0;
    if (prevTotal <= 0 || nowTotal <= 0) continue;

    const change = (nowTotal - prevTotal) / prevTotal;
    if (Math.abs(change) < CHANGE_THRESHOLD) continue;

    const pct = Math.round(Math.abs(change) * 100);
    insights.push({
      key: `change:${row.categoryId}:${year}-${month}`,
      tone: change > 0 ? "warning" : "success",
      title:
        change > 0
          ? `Gastaste ${pct}% más en ${name}`
          : `Gastaste ${pct}% menos en ${name}`,
      detail: `${formatCurrency(nowTotal)} este mes contra ${formatCurrency(prevTotal)} en ${
        MONTH_NAMES[prev.month - 1]
      }.`,
      href: `/movimientos?categoryId=${row.categoryId}`,
    });
  }

  // --- Presupuestos en riesgo ----------------------------------------------
  const currentTotals = new Map(
    currentByCategory.map((row) => [row.categoryId, toNumber(row._sum.amount ?? 0)])
  );
  // Qué tanto del mes ha transcurrido: gastar el 80% del presupuesto el día 5
  // es muy distinto a gastarlo el día 25.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthProgress = now.getUTCDate() / daysInMonth;

  for (const budget of budgets) {
    const spent = currentTotals.get(budget.categoryId) ?? 0;
    const limit = toNumber(budget.amount);
    if (limit <= 0) continue;
    const used = spent / limit;

    if (used >= 1) {
      insights.push({
        key: `budget-over:${budget.id}`,
        tone: "danger",
        title: `Te pasaste del presupuesto de ${budget.category.name}`,
        detail: `Llevas ${formatCurrency(spent)} de ${formatCurrency(limit)}.`,
        href: "/presupuestos",
      });
    } else if (used > monthProgress + 0.2) {
      insights.push({
        key: `budget-pace:${budget.id}`,
        tone: "warning",
        title: `Vas rápido con ${budget.category.name}`,
        detail: `Llevas ${Math.round(used * 100)}% del presupuesto y apenas va ${Math.round(
          monthProgress * 100
        )}% del mes.`,
        href: "/presupuestos",
      });
    }
  }

  // --- Suscripciones -------------------------------------------------------
  for (const subscription of subscriptions) {
    const last = toNumber(subscription.lastAmount);
    const prevAmount = subscription.previousAmount ? toNumber(subscription.previousAmount) : null;

    if (prevAmount && last > prevAmount * 1.05) {
      insights.push({
        key: `sub-raise:${subscription.id}:${last}`,
        tone: "warning",
        title: `${subscription.label} subió de precio`,
        detail: `Pasó de ${formatCurrency(prevAmount)} a ${formatCurrency(last)}.`,
        href: "/suscripciones",
      });
    } else {
      insights.push({
        key: `sub-new:${subscription.id}`,
        tone: "info",
        title: `Parece que ${subscription.label} es una suscripción`,
        detail: `${subscription.occurrences} cargos de ~${formatCurrency(
          last
        )} cada ${subscription.cadenceDays} días.`,
        href: "/suscripciones",
      });
    }
  }

  return insights.filter((insight) => !dismissedKeys.has(insight.key));
}
