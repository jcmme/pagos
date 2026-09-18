"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { MonthlyTotal } from "@/lib/metrics/monthly";

// Una sola serie (el gasto del mes), así que no lleva leyenda: el título la
// nombra. La línea punteada es el promedio del periodo, que es contra lo que
// uno compara de verdad al mirar el mes en curso.
export function MonthlyTrend({ data }: { data: MonthlyTotal[] }) {
  // recharts anima las barras al montar con su propio motor, que no consulta
  // la preferencia del sistema. Hay que apagárselo a mano.
  const reducedMotion = useReducedMotion();
  const average =
    data.reduce((sum, month) => sum + month.expenses, 0) /
    Math.max(1, data.length);

  return (
    <div className="w-full">
      {/* El promedio va como texto y no como etiqueta dentro de la gráfica:
          ahí se encimaba con la barra más alta. */}
      <p className="mb-2 flex items-center gap-2 text-[12px] text-(--foreground-muted)">
        <span className="inline-block h-px w-5 border-t border-dashed border-(--foreground-subtle)" />
        Promedio {formatCurrency(average)} al mes
      </p>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--foreground-subtle)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: "var(--foreground-subtle)", fontSize: 11 }}
              tickFormatter={(value) => formatCurrency(Number(value))}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-3)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-strong)",
                borderRadius: 12,
                color: "var(--foreground)",
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--foreground-muted)" }}
              formatter={(value) => [formatCurrency(Number(value)), "Gastos"]}
            />
            <ReferenceLine
              y={average}
              stroke="var(--foreground-subtle)"
              strokeDasharray="4 4"
            />
            <Bar
              dataKey="expenses"
              fill="var(--accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              isAnimationActive={!reducedMotion}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
