"use client";

import Link from "next/link";
import {
  CalendarClock,
  Flame,
  PiggyBank,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useCountUp } from "@/components/ui/CountUp";
import { formatMoneyParts } from "@/lib/money";
import { IconBadge } from "@/components/ui/IconBadge";
import { cn, formatCurrency } from "@/lib/utils";

// Las píldoras las arma el servidor, que es quien tiene los datos; aquí solo
// se dibujan. El icono viaja como texto porque un componente de React no
// cruza la frontera servidor → cliente.
export type HeroPill = {
  label: string;
  value: string;
  tone: "accent" | "success" | "warning" | "danger" | "purple";
  href: string;
  icon: "budget" | "today" | "perDay" | "payment";
};

const PILL_ICONS: Record<HeroPill["icon"], LucideIcon> = {
  budget: PiggyBank,
  today: Sun,
  perDay: Flame,
  payment: CalendarClock,
};

const TONE_COLORS: Record<HeroPill["tone"], string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  purple: "var(--purple)",
};

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function Hero({
  amount,
  available,
  reason,
  spent,
  budget,
  horizonDays,
  hasNextIncome,
  pills,
}: {
  amount: number;
  available: boolean;
  reason?: string;
  spent: number;
  budget: number;
  horizonDays: number;
  hasNextIncome: boolean;
  pills: HeroPill[];
}) {
  const shown = useCountUp(amount);
  const money = formatMoneyParts(shown);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        {/* El saludo depende de la hora del teléfono, que el servidor no
            conoce: ahí se renderiza en UTC y el cliente lo corrige. Es texto
            decorativo, así que se silencia el aviso en vez de montar un efecto
            que provocaría un parpadeo. */}
        <p
          suppressHydrationWarning
          className="text-[13px] text-(--foreground-muted)"
        >
          {greeting(new Date().getHours())}
        </p>

        {available ? (
          <>
            <p
              className={cn(
                "mt-0.5 font-semibold leading-none tabular-nums",
                amount < 0 ? "text-(--danger)" : "text-(--foreground)"
              )}
            >
              <span className="text-[44px] tracking-tight">
                {money.sign}
                {money.integer}
              </span>
              <span className="text-[20px] text-(--foreground-muted)">
                {money.decimalSeparator}
                {money.cents} {money.currency}
              </span>
            </p>
            <p className="mt-1.5 text-[13px] text-(--foreground-muted)">
              te queda por gastar
              {hasNextIncome
                ? ` hasta tu próximo ingreso, en ${horizonDays} días`
                : ` este mes, en ${horizonDays} días`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-(--foreground-muted)">{reason}</p>
        )}
      </div>

      {budget > 0 && (
        // Acotada en escritorio: estirada a todo lo ancho, la barra deja de
        // leerse como parte de la cifra y parece un separador.
        <div className="mx-auto w-full max-w-sm">
          {/* Barra propia y no ProgressBar: aquí va a dos píxeles y sin fondo
              de tarjeta, para que la cifra siga siendo lo único que pesa. */}
          <div className="h-1 w-full overflow-hidden rounded-(--radius-full) bg-(--surface-2)">
            <div
              className="h-full rounded-(--radius-full) transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (spent / budget) * 100)}%`,
                background:
                  spent >= budget
                    ? "var(--danger)"
                    : spent / budget >= 0.8
                      ? "var(--warning)"
                      : "var(--accent)",
              }}
            />
          </div>
          <p className="mt-1.5 text-center text-[12px] text-(--foreground-subtle)">
            {formatCurrency(spent)} de {formatCurrency(budget)} presupuestados
          </p>
        </div>
      )}

      {pills.length > 0 && (
        // Se desliza en vez de apretarse: con cuatro píldoras y nombres en
        // español, partirlas en dos renglones se ve peor que dejar asomar la
        // cuarta e invitar a arrastrar.
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:justify-center md:px-0">
          {pills.map((pill) => {
            const Icon = PILL_ICONS[pill.icon];
            return (
              <Link
                key={pill.label}
                href={pill.href}
                className="pressable flex w-[104px] shrink-0 snap-start flex-col gap-1.5 rounded-(--radius-md) bg-(--surface) p-3"
              >
                <IconBadge icon={Icon} color={TONE_COLORS[pill.tone]} size="sm" />
                <span className="block truncate text-[10px] uppercase tracking-wide text-(--foreground-subtle)">
                  {pill.label}
                </span>
                <span className="text-[15px] font-semibold tabular-nums leading-none">
                  {pill.value}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
