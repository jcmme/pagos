import { getHealthReport } from "@/lib/metrics";
import { getMonthlyTotals } from "@/lib/metrics/monthly";
import { requireUserId } from "@/lib/session";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/utils";
import type { Metric } from "@/lib/metrics/types";
import { MonthlyTrend } from "../MonthlyTrend";

export const dynamic = "force-dynamic";

function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Buena";
  if (score >= 50) return "Regular";
  if (score >= 30) return "Necesita atención";
  return "Crítica";
}

function MetricCard({
  title,
  metric,
  format,
  hint,
}: {
  title: string;
  metric: Metric;
  format: (value: number) => string;
  hint: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {metric.available && <Badge tone={scoreTone(metric.score)}>{metric.score}/100</Badge>}
      </div>

      {metric.available ? (
        <>
          <p className="mt-1 text-[24px] font-semibold">{format(metric.value)}</p>
          <p className="mt-0.5 text-[13px] text-(--foreground-muted)">
            Meta: {format(metric.target)}
          </p>
          <ProgressBar value={metric.score} max={100} className="mt-3" semantics="goal" />
          <p className="mt-2 text-[12px] text-(--foreground-subtle)">{hint}</p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-(--foreground-muted)">{metric.reason}</p>
      )}
    </Card>
  );
}

export default async function SaludPage() {
  const userId = await requireUserId();
  const [report, monthly] = await Promise.all([
    getHealthReport(userId),
    getMonthlyTotals(userId),
  ]);

  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const months = (value: number) => `${value.toFixed(1)} meses`;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-semibold">Salud financiera</h1>

      <Card>
        {report.enoughData ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Tu score</CardTitle>
                <p className="mt-1 text-[40px] font-semibold leading-none">{report.score}</p>
                <p className="mt-1 text-[14px] text-(--foreground-muted)">
                  {scoreLabel(report.score)}
                </p>
              </div>
              <Badge tone={scoreTone(report.score)} className="text-[13px]">
                {report.score}/100
              </Badge>
            </div>
            <ProgressBar value={report.score} max={100} className="mt-4" semantics="goal" />
            {report.partial && (
              <p className="mt-3 text-[12px] text-(--foreground-subtle)">
                El score se calcula solo con los pilares que tienen datos suficientes.
                Conforme registres más información se vuelve más preciso.
              </p>
            )}
          </>
        ) : (
          <>
            <CardTitle>Tu score</CardTitle>
            <p className="mt-2 text-[14px] text-(--foreground-muted)">
              Todavía no hay movimientos suficientes para calcularlo. Llevas{" "}
              {report.transactionCount} y se necesitan al menos 10 para que el número
              signifique algo.
            </p>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title="Tasa de ahorro"
          metric={report.savingsRate}
          format={percent}
          hint="Cuánto de lo que ganas te queda. Lo recomendable es guardar al menos 20%."
        />
        <MetricCard
          title="Fondo de emergencia"
          metric={report.emergencyFund}
          format={months}
          hint="Meses que aguantarías cubriendo tus gastos esenciales sin ingresos."
        />
        <MetricCard
          title="Peso de la deuda"
          metric={report.debtToIncome}
          format={percent}
          hint="Qué parte de tu ingreso mensual se va en deuda. Debajo de 36% es saludable."
        />
        <MetricCard
          title="Disciplina de presupuesto"
          metric={report.budgetAdherence}
          format={percent}
          hint="Porcentaje de tus categorías que se mantuvo dentro del límite este mes."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Patrimonio neto</CardTitle>
          <p
            className={`mt-1 text-[24px] font-semibold ${
              report.netWorth.total < 0 ? "text-(--danger)" : ""
            }`}
          >
            {formatCurrency(report.netWorth.total)}
          </p>
          <div className="mt-2 flex gap-5 text-[13px] text-(--foreground-muted)">
            <span>Activos {formatCurrency(report.netWorth.assets)}</span>
            <span>Pasivos {formatCurrency(report.netWorth.liabilities)}</span>
          </div>
        </Card>

        <Card>
          <CardTitle>Flujo del mes</CardTitle>
          <p
            className={`mt-1 text-[24px] font-semibold ${
              report.cashFlow.net < 0 ? "text-(--danger)" : "text-(--success)"
            }`}
          >
            {formatCurrency(report.cashFlow.net)}
          </p>
          <div className="mt-2 flex gap-5 text-[13px] text-(--foreground-muted)">
            <span>Entró {formatCurrency(report.cashFlow.income)}</span>
            <span>Salió {formatCurrency(report.cashFlow.expenses)}</span>
          </div>
        </Card>
      </div>

      {/* Vive aquí y no en el Resumen: allá compite con el panel de tendencia,
          que dice lo mismo en chico. Esta es la pantalla del detalle. */}
      <Card>
        <CardTitle className="mb-1">Gasto de los últimos 6 meses</CardTitle>
        <p className="mb-3 text-[12px] text-(--foreground-subtle)">
          Incluye el mes en curso, que todavía va a la mitad.
        </p>
        <MonthlyTrend data={monthly} />
      </Card>
    </div>
  );
}
