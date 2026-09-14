import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentMonthYear, monthRange } from "@/lib/dates";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/utils";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { CategoryChart } from "./CategoryChart";
import { PushManager } from "@/components/PushManager";

export const dynamic = "force-dynamic";

function urgencyTone(days: number): "danger" | "warning" | "accent" | "neutral" {
  if (days <= 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "accent";
  return "neutral";
}

function urgencyLabel(days: number) {
  if (days < 0) return `Vencido`;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}

export default async function DashboardPage() {
  const { month, year } = currentMonthYear();
  const { start, end } = monthRange(year, month);

  const [payments, expenses, budgets, debts] = await Promise.all([
    prisma.fixedPayment.findMany({ where: { active: true }, include: { category: true } }),
    prisma.expense.findMany({ where: { date: { gte: start, lt: end } }, include: { category: true } }),
    prisma.budget.findMany({ where: { month, year }, include: { category: true } }),
    prisma.debt.findMany({ include: { payments: true } }),
  ]);

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

  const upcoming = payments
    .map((p) => ({ payment: p, days: daysUntil(computeNextDueDate(p)) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const owedByMe = debts
    .filter((d) => d.type === "OWE")
    .reduce((sum, d) => sum + Math.max(0, Number(d.totalAmount) - d.payments.reduce((s, p) => s + Number(p.amount), 0)), 0);
  const owedToMe = debts
    .filter((d) => d.type === "OWED")
    .reduce((sum, d) => sum + Math.max(0, Number(d.totalAmount) - d.payments.reduce((s, p) => s + Number(p.amount), 0)), 0);

  const byCategory = new Map<string, { name: string; color: string; value: number }>();
  for (const e of expenses) {
    const key = e.category?.id ?? "none";
    const name = e.category?.name ?? "Sin categoría";
    const color = e.category?.color ?? "#6e6e73";
    const prev = byCategory.get(key);
    byCategory.set(key, { name, color, value: (prev?.value ?? 0) + Number(e.amount) });
  }
  const chartData = Array.from(byCategory.values()).sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-semibold">Resumen</h1>

      <PushManager />

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
          <CardTitle>Deudas</CardTitle>
          <div className="mt-1 flex justify-between">
            <div>
              <p className="text-[12px] text-(--foreground-muted)">Yo debo</p>
              <p className="text-[20px] font-semibold text-(--danger)">{formatCurrency(owedByMe)}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-(--foreground-muted)">Me deben</p>
              <p className="text-[20px] font-semibold text-(--success)">{formatCurrency(owedToMe)}</p>
            </div>
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
              <div className="flex items-center gap-2 min-w-0">
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
            <p className="text-[14px] text-(--foreground-muted)">No tienes pagos fijos activos.</p>
          )}
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Gasto por categoría</CardTitle>
          <CategoryChart data={chartData} />
        </Card>
      )}
    </div>
  );
}
