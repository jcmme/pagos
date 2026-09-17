import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency, toNumber } from "@/lib/utils";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { getHealthReport } from "@/lib/metrics";
import { getAvailableToSpend } from "@/lib/metrics/available";
import { generateInsights } from "@/modules/insights/generate";
import { getMonthlyTotals } from "@/lib/metrics/monthly";
import { nextMonthlyDate } from "@/modules/reminders/schedule";
import { CategoryChart } from "./CategoryChart";
import { MonthlyTrend } from "./MonthlyTrend";
import { PaymentCalendar, type CalendarEvent } from "./PaymentCalendar";
import { InsightsList } from "./InsightsList";
import { PushManager } from "@/components/PushManager";

export const dynamic = "force-dynamic";

function urgencyTone(days: number): "danger" | "warning" | "accent" | "neutral" {
  if (days <= 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "accent";
  return "neutral";
}

function urgencyLabel(days: number) {
  if (days < 0) return "Vencido";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { month, year } = currentMonthYear();
  const { start, end } = monthRange(year, month);

  const [payments, expenses, budgets, health, available, insights, monthly, cards] =
    await Promise.all([
    prisma.fixedPayment.findMany({
      where: { userId, active: true, kind: "EXPENSE" },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        kind: "EXPENSE",
        excludeFromStats: false,
        date: { gte: start, lt: end },
      },
      include: { category: { include: { parent: { include: { parent: true } } } } },
    }),
    prisma.budget.findMany({ where: { userId, month, year } }),
    getHealthReport(userId),
    getAvailableToSpend(userId),
    generateInsights(userId),
    getMonthlyTotals(userId),
    prisma.account.findMany({
      where: { userId, type: "CREDIT_CARD", archived: false },
      select: { id: true, name: true, cutoffDay: true, paymentDueDay: true },
    }),
  ]);

  const totalSpent = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + toNumber(budget.amount), 0);

  const upcoming = payments
    .map((payment) => ({ payment, days: daysUntil(computeNextDueDate(payment)) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // Se agrupa por la categoría raíz para que la gráfica no se fragmente en
  // veinte barras de subcategorías. Con tres niveles hay que subir dos veces,
  // no una.
  const byCategory = new Map<
    string,
    { id: string; name: string; color: string; value: number }
  >();
  for (const expense of expenses) {
    const root =
      expense.category?.parent?.parent ?? expense.category?.parent ?? expense.category;
    const key = root?.id ?? "none";
    const previous = byCategory.get(key);
    byCategory.set(key, {
      id: key,
      name: root?.name ?? "Sin categoría",
      color: root?.color ?? "#6e6e73",
      value: (previous?.value ?? 0) + toNumber(expense.amount),
    });
  }
  const chartData = Array.from(byCategory.values()).sort((a, b) => b.value - a.value);

  // El calendario solo muestra lo que cae dentro del mes en curso.
  const calendarEvents: CalendarEvent[] = [
    ...payments.flatMap((payment) => {
      const due = computeNextDueDate(payment);
      if (due.getUTCMonth() + 1 !== month || due.getUTCFullYear() !== year) return [];
      return [
        {
          day: due.getUTCDate(),
          label: payment.name,
          amount: toNumber(payment.amount),
          kind: "FIXED_PAYMENT" as const,
        },
      ];
    }),
    ...cards.flatMap((card) => {
      const events: CalendarEvent[] = [];
      if (card.paymentDueDay) {
        const due = nextMonthlyDate(card.paymentDueDay);
        if (due.getUTCMonth() + 1 === month && due.getUTCFullYear() === year) {
          events.push({
            day: due.getUTCDate(),
            label: `Pago de ${card.name}`,
            amount: null,
            kind: "CARD_PAYMENT",
          });
        }
      }
      if (card.cutoffDay) {
        const cutoff = nextMonthlyDate(card.cutoffDay);
        if (cutoff.getUTCMonth() + 1 === month && cutoff.getUTCFullYear() === year) {
          events.push({
            day: cutoff.getUTCDate(),
            label: `Corte de ${card.name}`,
            amount: null,
            kind: "CARD_CUTOFF",
          });
        }
      }
      return events;
    }),
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-semibold">Resumen</h1>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Disponible para gastar</CardTitle>
            {available.available ? (
              <>
                <p
                  className={`mt-1 text-[32px] font-semibold leading-tight ${
                    available.amount < 0 ? "text-(--danger)" : "text-(--success)"
                  }`}
                >
                  {formatCurrency(available.amount)}
                </p>
                <p className="mt-1 text-[13px] text-(--foreground-muted)">
                  {formatCurrency(available.liquid)} en cuentas −{" "}
                  {formatCurrency(available.upcomingPayments)} de pagos próximos
                  {available.goalReserves > 0
                    ? ` − ${formatCurrency(available.goalReserves)} apartado en metas`
                    : ""}
                </p>
                <p className="mt-0.5 text-[12px] text-(--foreground-subtle)">
                  {available.nextIncomeAt
                    ? `Hasta tu próximo ingreso, en ${available.horizonDays} días.`
                    : `Hasta fin de mes, en ${available.horizonDays} días.`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-(--foreground-muted)">{available.reason}</p>
            )}
          </div>

          <Link href="/salud" className="text-right">
            <p className="text-[13px] text-(--foreground-muted)">Salud financiera</p>
            <p className="text-[32px] font-semibold leading-tight">
              {health.enoughData ? health.score : "—"}
            </p>
            <p className="text-[12px] text-(--accent)">Ver detalle</p>
          </Link>
        </div>
      </Card>

      <InsightsList insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Gasto del mes</CardTitle>
          <p className="mt-1 text-[26px] font-semibold">{formatCurrency(totalSpent)}</p>
          {totalBudget > 0 && (
            <>
              <p className="mt-1 text-[13px] text-(--foreground-muted)">
                de {formatCurrency(totalBudget)} presupuestados
              </p>
              <ProgressBar value={totalSpent} max={totalBudget} className="mt-2" />
            </>
          )}
        </Card>

        <Card>
          <CardTitle>Patrimonio neto</CardTitle>
          <p
            className={`mt-1 text-[26px] font-semibold ${
              health.netWorth.total < 0 ? "text-(--danger)" : ""
            }`}
          >
            {formatCurrency(health.netWorth.total)}
          </p>
          <div className="mt-1 flex gap-4 text-[13px] text-(--foreground-muted)">
            <span>Activos {formatCurrency(health.netWorth.assets)}</span>
            <span>Pasivos {formatCurrency(health.netWorth.liabilities)}</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>Pagos próximos</CardTitle>
          <Link href="/pagos" className="text-[13px] text-(--accent)">
            Ver todos
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {upcoming.map(({ payment, days }) => (
            <div key={payment.id} className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: payment.category?.color ?? "#6e6e73" }}
                />
                <span className="truncate text-[14px]">{payment.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[14px] text-(--foreground-muted)">
                  {formatCurrency(payment.amount)}
                </span>
                <Badge tone={urgencyTone(days)}>{urgencyLabel(days)}</Badge>
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-[14px] text-(--foreground-muted)">
              No tienes pagos fijos activos.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Qué se paga este mes</CardTitle>
        <PaymentCalendar
          year={year}
          month={month}
          today={new Date().getUTCDate()}
          events={calendarEvents}
        />
      </Card>

      <Card>
        <CardTitle className="mb-1">Gasto por categoría</CardTitle>
        <p className="mb-3 text-[12px] text-(--foreground-subtle)">
          Este mes. Toca una para ver sus movimientos.
        </p>
        <CategoryChart data={chartData} />
      </Card>

      <Card>
        <CardTitle className="mb-1">Gasto de los últimos 6 meses</CardTitle>
        <p className="mb-3 text-[12px] text-(--foreground-subtle)">
          Incluye el mes en curso, que todavía va a la mitad.
        </p>
        <MonthlyTrend data={monthly} />
      </Card>

      <PushManager />
    </div>
  );
}
