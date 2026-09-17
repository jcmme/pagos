"use client";

import { cn, formatCurrency } from "@/lib/utils";

export type CalendarEvent = {
  day: number;
  label: string;
  amount: number | null;
  kind: "FIXED_PAYMENT" | "CARD_PAYMENT" | "CARD_CUTOFF";
};

const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

const TONE: Record<CalendarEvent["kind"], string> = {
  FIXED_PAYMENT: "var(--accent)",
  CARD_PAYMENT: "var(--danger)",
  CARD_CUTOFF: "var(--warning)",
};

// La respuesta visual a "qué me toca pagar": el mes de un vistazo, con los
// días marcados. Un calendario y no una lista porque lo que se quiere saber es
// cuándo cae cada cosa y si se amontonan.
export function PaymentCalendar({
  year,
  month,
  today,
  events,
}: {
  year: number;
  /** 1-12 */
  month: number;
  /** Día del mes actual, o null si el mes mostrado no es el de hoy. */
  today: number | null;
  events: CalendarEvent[];
}) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay da 0 para domingo; la semana aquí empieza en lunes.
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    byDay.set(event.day, [...(byDay.get(event.day) ?? []), event]);
  }

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-(--foreground-subtle)">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={index}>{initial}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />;
          const dayEvents = byDay.get(day) ?? [];

          return (
            <div
              key={day}
              title={dayEvents
                .map((event) =>
                  event.amount
                    ? `${event.label} · ${formatCurrency(event.amount)}`
                    : event.label
                )
                .join("\n")}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-(--radius-sm) text-[12px]",
                today === day
                  ? "bg-(--accent)/20 font-semibold text-(--accent)"
                  : dayEvents.length > 0
                    ? "bg-(--surface-2) text-(--foreground)"
                    : "text-(--foreground-subtle)"
              )}
            >
              {day}
              <span className="flex h-1.5 gap-0.5">
                {dayEvents.slice(0, 3).map((event, position) => (
                  <span
                    key={position}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: TONE[event.kind] }}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* Los puntos son color solo, así que la leyenda va siempre. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-(--foreground-muted)">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE.FIXED_PAYMENT }} />
          Pago fijo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE.CARD_PAYMENT }} />
          Límite de tarjeta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE.CARD_CUTOFF }} />
          Corte
        </span>
      </div>
    </div>
  );
}
