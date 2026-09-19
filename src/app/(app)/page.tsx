import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CountUp } from "@/components/ui/CountUp";
import { formatCurrency, toNumber } from "@/lib/utils";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { getHealthReport } from "@/lib/metrics";
import { getAvailableToSpend } from "@/lib/metrics/available";
import { generateInsights } from "@/modules/insights/generate";
import { getMonthlyTotals } from "@/lib/metrics/monthly";
import { getWeekTotals } from "@/lib/metrics/daily";
import { getAccountsWithBalances } from "@/modules/accounts/balance";
import { nextMonthlyDate } from "@/modules/reminders/schedule";
import { CategoryChart } from "./CategoryChart";
import { AccountCarousel } from "./AccountCarousel";
import { Hero, type HeroPill } from "./Hero";
import { MiniBars } from "./MiniBars";
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

  const [payments, expenses, budgets, health, available, insights, monthly, week, accounts] =
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
    getWeekTotals(userId),
    getAccountsWithBalances(userId),
  ]);

  // El calendario solo necesita las tarjetas, que salen del mismo listado en
  // vez de una segunda consulta.
  const activeAccounts = accounts.filter((account) => !account.archived);
  const cards = activeAccounts.filter((account) => account.type === "CREDIT_CARD");

  const totalSpent = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + toNumber(budget.amount), 0);

  const upcoming = payments
    .map((payment) => ({ payment, days: daysUntil(computeNextDueDate(payment)) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // Las píldoras del encabezado. Salen de lo que ya está en memoria: ninguna
  // añade una consulta.
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const todaySpent = expenses
    .filter((expense) => expense.date.toISOString().slice(0, 10) === todayKey)
    .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  // Promedio sobre los días transcurridos, no sobre el mes entero: el día 3
  // dividir entre 30 haría parecer que no se gasta nada.
  const perDay = totalSpent / Math.max(1, now.getUTCDate());
  const nextPayment = upcoming[0];

  const pills: HeroPill[] = [];
  if (totalBudget > 0) {
    const used = totalSpent / totalBudget;
    pills.push({
      label: "Presupuesto",
      value: `${Math.round(used * 100)}%`,
      tone: used >= 1 ? "danger" : used >= 0.8 ? "warning" : "success",
      href: "/presupuestos",
      icon: "budget",
    });
  }
  pills.push(
    {
      label: "Hoy",
      value: formatCurrency(todaySpent),
      tone: "accent",
      href: "/movimientos",
      icon: "today",
    },
    {
      label: "Por día",
      value: formatCurrency(perDay),
      tone: "purple",
      href: "/movimientos",
      icon: "perDay",
    }
  );
  if (nextPayment) {
    const tone = urgencyTone(nextPayment.days);
    pills.push({
      label: nextPayment.payment.name,
      value: urgencyLabel(nextPayment.days),
      // urgencyTone devuelve "neutral" a más de una semana, que no es un color
      // de píldora; ahí basta el acento.
      tone: tone === "neutral" ? "accent" : tone,
      href: "/pagos",
      icon: "payment",
    });
  }

  const weekTotal = week.reduce((sum, day) => sum + day.total, 0);

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
      <Hero
        amount={available.amount}
        available={available.available}
        reason={available.reason}
        spent={totalSpent}
        budget={totalBudget}
        horizonDays={available.horizonDays}
        hasNextIncome={available.nextIncomeAt !== null}
        pills={pills}
      />

      <AccountCarousel accounts={activeAccounts} />

      <InsightsList insights={insights} />

      {/* Los dos paneles chicos sustituyen a la tarjeta de "Gasto del mes":
          decían lo mismo que la barra del encabezado, pero sin el reparto por
          día ni por mes. */}
      <div className="grid grid-cols-2 gap-3">
        <MiniBars
          title="Semana"
          icon="weekly"
          period="Esta semana"
          total={weekTotal}
          href="/movimientos"
          bars={week.map((day) => ({
            label: day.label,
            value: day.total,
            current: day.isToday,
            future: day.isFuture,
          }))}
        />
        <MiniBars
          title="Tendencia"
          icon="trend"
          period="Este mes"
          total={totalSpent}
          href="/salud"
          bars={monthly.map((item, index) => ({
            label: item.label.slice(0, 1),
            value: item.expenses,
            current: index === monthly.length - 1,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Patrimonio neto</CardTitle>
          <p
            className={`mt-1 text-[26px] font-semibold ${
              health.netWorth.total < 0 ? "text-(--danger)" : ""
            }`}
          >
            <CountUp value={health.netWorth.total} />
          </p>
          <div className="mt-1 flex gap-4 text-[13px] text-(--foreground-muted)">
            <span>Activos {formatCurrency(health.netWorth.assets)}</span>
            <span>Pasivos {formatCurrency(health.netWorth.liabilities)}</span>
          </div>
        </Card>

        <Link href="/salud">
          <Card className="pressable h-full">
            <CardTitle>Salud financiera</CardTitle>
            <p className="mt-1 text-[26px] font-semibold">
              {health.enoughData ? health.score : "—"}
            </p>
            <p className="mt-1 text-[13px] text-(--accent)">Ver detalle</p>
          </Card>
        </Link>
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

      <PushManager />
    </div>
  );
}
