"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { formatMoneyParts } from "@/lib/money";
import { cardStatus, daysLabel } from "@/modules/accounts/card-status";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { AccountWithBalance } from "@/modules/accounts/balance";

const TYPE_ICONS: Record<string, LucideIcon> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Banknote,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
  LOAN: Wallet,
};

/**
 * Las cuentas como tarjetas que se deslizan de lado.
 *
 * Con scroll-snap del navegador y no con gestos a mano: `snap-mandatory` da la
 * inercia y el rebote del sistema gratis, respeta el scroll con teclado y con
 * lector de pantalla, y no hay que escribir una sola línea de física. Una pila
 * en 3D se vería más lucida en una captura y peor en el dedo.
 */
export function AccountCarousel({ accounts }: { accounts: AccountWithBalance[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  if (accounts.length === 0) {
    return (
      <Link
        href="/cuentas"
        className="pressable flex h-[132px] items-center justify-center rounded-(--radius-lg) border border-dashed border-(--border-strong) text-[14px] text-(--foreground-muted)"
      >
        Agrega tu primera cuenta
      </Link>
    );
  }

  // Cuál se está viendo, para el indicador: la tarjeta cuyo centro queda más
  // cerca del centro del carril. Se mide en vez de dividir por el ancho porque
  // la última tarjeta nunca llega a centrarse del todo —el scroll se topa— y
  // una división la dejaría marcando la anterior.
  function onScroll() {
    const node = track.current;
    if (!node) return;
    const middle = node.scrollLeft + node.clientWidth / 2;

    let closest = 0;
    let best = Infinity;
    for (const [index, child] of [...node.children].entries()) {
      const element = child as HTMLElement;
      const distance = Math.abs(element.offsetLeft + element.offsetWidth / 2 - middle);
      if (distance < best) {
        best = distance;
        closest = index;
      }
    }
    setCurrent(closest);
  }

  function goTo(index: number) {
    const node = track.current;
    node?.children[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={track}
        onScroll={onScroll}
        role="group"
        aria-label="Tus cuentas"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
      >
        {accounts.map((account) => {
          const Icon = TYPE_ICONS[account.type] ?? Wallet;
          const money = formatMoneyParts(account.balance);
          const status = account.type === "CREDIT_CARD" ? cardStatus(account) : null;

          return (
            <Link
              key={account.id}
              href="/cuentas"
              className="pressable relative flex min-h-[132px] w-[86%] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-(--radius-lg) p-4 md:w-[300px]"
              style={{
                // El color de la cuenta manda, pero apagado sobre el fondo
                // negro: a plena saturación una tarjeta de estas vibra y se
                // come al resto de la pantalla.
                background: `linear-gradient(140deg, ${account.color}38, ${account.color}12 60%, var(--surface))`,
              }}
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-(--radius-lg) border"
                style={{ borderColor: `${account.color}40` }}
              />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{account.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-(--foreground-subtle)">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                    {account.last4 ? ` ····${account.last4}` : ""}
                  </p>
                </div>
                <Icon size={18} style={{ color: account.color }} className="shrink-0" />
              </div>

              <div>
                <p
                  className={cn(
                    "font-semibold tabular-nums",
                    account.balance < 0 ? "text-(--danger)" : "text-(--foreground)"
                  )}
                >
                  <span className="text-[26px]">
                    {money.sign}
                    {money.integer}
                  </span>
                  <span className="text-[13px] text-(--foreground-muted)">
                    {money.decimalSeparator}
                    {money.cents}
                  </span>
                </p>

                {status?.configured ? (
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-(--foreground-muted)">
                    {status.limit ? (
                      <span>
                        {formatCurrency(status.used)} de {formatCurrency(status.limit)}
                      </span>
                    ) : null}
                    {status.cutoffDays !== null && (
                      <span>Corte {daysLabel(status.cutoffDays)}</span>
                    )}
                    {status.dueDays !== null && (
                      <span
                        className={status.dueDays <= 2 ? "font-medium text-(--warning)" : ""}
                      >
                        Pago {daysLabel(status.dueDays)}
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      {accounts.length > 1 && (
        // El indicador también navega: en escritorio, donde no hay dedo que
        // arrastre, es la única forma cómoda de llegar a la última tarjeta.
        <div className="flex justify-center gap-2">
          {accounts.map((account, index) => (
            <button
              key={account.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Ver ${account.name}`}
              aria-current={index === current}
              className={cn(
                "h-2 rounded-(--radius-full) transition-all duration-200",
                index === current ? "w-6" : "w-2 opacity-40"
              )}
              style={{ background: account.color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
