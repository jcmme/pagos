"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Datum = { id: string; name: string; color: string; value: number };

// Barras horizontales ordenadas en vez de una dona: los nombres de categoría
// son largos y lo que se quiere leer es el orden ("¿en qué se me va más?"),
// que en un anillo hay que adivinar comparando ángulos.
//
// Cada barra lleva su nombre y su monto encima, así que la identidad nunca
// depende solo del color, y cada una entra a los movimientos de su categoría.
export function CategoryChart({ data }: { data: Datum[] }) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-(--foreground-muted)">
        Aún no hay gastos este mes.
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...data.map((item) => item.value));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;

        return (
          <Link
            key={item.id}
            href={`/movimientos?categoryId=${item.id}`}
            className="group block"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="truncate text-(--foreground)">{item.name}</span>
                <span className="shrink-0 text-(--foreground-subtle)">{share}%</span>
              </span>
              <span className="shrink-0 tabular-nums text-(--foreground)">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-(--surface-3)">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${max > 0 ? (item.value / max) * 100 : 0}%`,
                  background: item.color,
                }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
