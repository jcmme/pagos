"use client";

import Link from "next/link";
import { BarChart3, ChevronRight, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoneyParts } from "@/lib/money";
import { ICON } from "@/lib/icons";

export type MiniBar = {
  label: string;
  value: number;
  /** El día u mes en curso, que va resaltado. */
  current?: boolean;
  /** Lo que todavía no ocurre: se dibuja apenas insinuado. */
  future?: boolean;
};

const ICONS: Record<"weekly" | "trend", LucideIcon> = {
  weekly: BarChart3,
  trend: TrendingUp,
};

// Dos paneles con la misma forma en vez de dos componentes: la única
// diferencia entre "esta semana" y "este mes" son las etiquetas.
//
// Sin recharts a propósito. Son siete divs de tres píxeles; montar un motor de
// gráficas al lado del que ya usa la tendencia de seis meses costaría más
// JavaScript que toda la pantalla.
export function MiniBars({
  title,
  icon,
  period,
  total,
  bars,
  href,
}: {
  title: string;
  icon: "weekly" | "trend";
  period: string;
  total: number;
  bars: MiniBar[];
  href: string;
}) {
  const Icon = ICONS[icon];
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const money = formatMoneyParts(total);

  return (
    <Link
      href={href}
      className="pressable flex flex-col gap-3 rounded-(--radius-md) bg-(--surface) p-4"
    >
      <div className="flex items-center gap-1.5">
        <Icon size={ICON.sm} className="text-(--accent)" />
        <span className="text-[14px] font-semibold">{title}</span>
        <ChevronRight size={ICON.sm} className="ml-auto text-(--foreground-subtle)" />
      </div>

      <div>
        <p className="text-[12px] text-(--foreground-muted)">{period}</p>
        <p className="font-semibold tabular-nums text-(--accent)">
          <span className="text-[22px]">{money.integer}</span>
          <span className="text-[13px] opacity-70">
            {money.decimalSeparator}
            {money.cents} {money.currency}
          </span>
        </p>
      </div>

      <div className="flex h-12 items-end justify-between gap-1">
        {bars.map((bar, index) => (
          <div key={`${bar.label}-${index}`} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-9 w-full items-end justify-center">
              <div
                className={cn(
                  "w-[3px] rounded-(--radius-full) transition-[height] duration-500",
                  bar.current
                    ? "bg-(--accent)"
                    : bar.future
                      ? "bg-(--surface-3)"
                      : "bg-(--accent)/35"
                )}
                // Dos píxeles de piso: una barra en cero que desaparece del
                // todo hace creer que falta el día, no que no se gastó.
                style={{ height: `${Math.max(2, (bar.value / max) * 36)}px` }}
              />
            </div>
            <span
              className={cn(
                "text-[10px]",
                bar.current
                  ? "font-semibold text-(--foreground)"
                  : "text-(--foreground-subtle)"
              )}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
