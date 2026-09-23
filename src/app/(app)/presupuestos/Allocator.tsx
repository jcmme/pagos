"use client";

import { useActionState, useState, useTransition } from "react";
import { PiggyBank, Split } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CategoryGlyph } from "@/components/ui/CategoryGlyph";
import { ICON } from "@/lib/icons";
import { cn, formatCurrency } from "@/lib/utils";
import { saveAllocation, type ActionState } from "@/modules/budgets/actions";
import { setSavingsCategory } from "@/modules/categories/actions";

// El reparto del mes: cada categoría raíz con su porcentaje.
//
// La regla que lo hace distinto de un repartidor normal: **lo que no reparta se
// va a Ahorro**, sumado a lo que Ahorro ya tuviera. Por eso quedarse corto no
// es un error y el contador no regaña; el único error es pasarse del 100%.
//
// Todo el cálculo se repite aquí en el cliente para que la cifra se mueva
// mientras se teclea. Lo que se guarda es solo el porcentaje asignado, nunca el
// sobrante: si mañana baja Ocio, el ahorro sube solo.

export type AllocRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  savings: boolean;
  /** El porcentaje guardado, si reparte por porcentaje. */
  percent: number | null;
  /** El monto fijo que tuviera antes, que un porcentaje reemplaza. */
  fixed: number | null;
  spent: number;
};

const initialState: ActionState = { error: null };

function parsePercent(raw: string) {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function Allocator({
  rows,
  month,
  year,
  income,
  hasSavings,
}: {
  rows: AllocRow[];
  month: number;
  year: number;
  /** null cuando falta capturar el ingreso: se avisa y no se calcula. */
  income: number | null;
  hasSavings: boolean;
}) {
  const [percents, setPercents] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.percent !== null ? String(row.percent) : ""]))
  );
  const [state, formAction, saving] = useActionState(saveAllocation, initialState);
  const [, startTransition] = useTransition();

  const assigned = round2(
    rows.reduce((sum, row) => sum + parsePercent(percents[row.id] ?? ""), 0)
  );
  const over = assigned > 100;
  const leftover = over ? 0 : round2(100 - assigned);

  function share(row: AllocRow) {
    const own = parsePercent(percents[row.id] ?? "");
    // Ahorro se queda con lo suyo más lo que nadie repartió.
    const effective = row.savings && hasSavings ? own + leftover : own;
    return {
      own,
      effective: round2(effective),
      amount: income === null || effective === 0 ? null : round2((income * effective) / 100),
    };
  }

  // Cuadrar a mano, para quien no quiera que todo caiga en ahorro: el resto se
  // reparte entre las categorías que ya tienen algo asignado, y si ninguna
  // tiene, entre todas las que no son ahorro.
  function splitRest() {
    if (leftover <= 0) return;
    const withSome = rows.filter(
      (row) => !row.savings && parsePercent(percents[row.id] ?? "") > 0
    );
    const targets = withSome.length > 0 ? withSome : rows.filter((row) => !row.savings);
    if (targets.length === 0) return;

    const each = Math.floor((leftover / targets.length) * 100) / 100;
    setPercents((current) => {
      const next = { ...current };
      let given = 0;
      targets.forEach((row, index) => {
        // Al último se le da el resto para que la suma dé exactamente 100 en
        // vez de 99.99 por el redondeo.
        const add = index === targets.length - 1 ? round2(leftover - given) : each;
        given = round2(given + add);
        next[row.id] = String(round2(parsePercent(current[row.id] ?? "") + add));
      });
      return next;
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-medium">Reparto del mes</p>
          <p className="text-[12px] text-(--foreground-subtle)">
            Porcentajes sobre lo que tienes para gastar
          </p>
        </div>
        <span
          className={cn(
            "rounded-(--radius-full) px-2.5 py-1 text-[12px] tabular-nums",
            over
              ? "bg-[rgb(var(--danger-rgb)/0.15)] text-(--danger)"
              : "bg-(--surface-2) text-(--foreground-muted)"
          )}
        >
          {over ? `Te pasaste: ${assigned}%` : `Repartido ${assigned}%`}
        </span>
      </div>

      {income === null && (
        <p className="rounded-(--radius-md) bg-[rgb(var(--warning-rgb)/0.12)] px-3 py-2 text-[13px] text-(--warning)">
          Captura arriba lo que tienes este mes para ver cuánto es cada
          porcentaje. Los porcentajes se guardan igual.
        </p>
      )}

      {leftover > 0 && (
        <p
          className={cn(
            "flex items-start gap-2 rounded-(--radius-md) px-3 py-2 text-[13px]",
            hasSavings
              ? "bg-[rgb(var(--success-rgb)/0.12)] text-(--success)"
              : "bg-(--surface-2) text-(--foreground-muted)"
          )}
        >
          <PiggyBank size={ICON.sm} className="mt-0.5 shrink-0" />
          {hasSavings ? (
            <span>
              {leftover}% se va a ahorro
              {income !== null && ` (${formatCurrency((income * leftover) / 100)})`}
            </span>
          ) : (
            <span>
              {leftover}% queda sin repartir: marca abajo qué categoría es tu
              ahorro para que caiga ahí.
            </span>
          )}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />

        {rows.map((row, index) => {
          const { own, effective, amount } = share(row);
          const extra = round2(effective - own);
          const overspent = amount !== null && row.spent > amount;

          return (
            <div
              key={row.id}
              className="flex flex-col gap-2 rounded-(--radius-md) bg-(--surface-2) p-3"
            >
              <div className="flex items-center gap-2.5">
                <CategoryGlyph
                  name={row.name}
                  color={row.color}
                  icon={row.icon}
                  size="sm"
                  index={index}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[14px]">
                    {row.name}
                    {row.savings && (
                      <span className="rounded-(--radius-full) bg-[rgb(var(--success-rgb)/0.15)] px-1.5 py-0.5 text-[10px] text-(--success)">
                        ahorro
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] tabular-nums text-(--foreground-muted)">
                    {amount === null ? (
                      // Sin porcentaje no hay nada que calcular; sin ingreso sí
                      // lo habría, pero falta el dato. No es lo mismo y no se
                      // dice igual.
                      income === null ? (
                        "Sin calcular: falta tu ingreso"
                      ) : (
                        "Sin asignar"
                      )
                    ) : (
                      <>
                        {formatCurrency(row.spent)} de {formatCurrency(amount)}
                        {extra > 0 && ` · incluye ${extra}% sobrante`}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Input
                    name={`percent:${row.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    value={percents[row.id] ?? ""}
                    onChange={(event) =>
                      setPercents((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                    aria-label={`Porcentaje para ${row.name}`}
                    className="w-[72px] px-2 py-1.5 text-right tabular-nums"
                  />
                  <span className="text-[13px] text-(--foreground-subtle)">%</span>
                </div>
              </div>

              {amount !== null && amount > 0 && (
                <ProgressBar value={row.spent} max={amount} />
              )}

              {row.fixed !== null && (
                <p className="text-[12px] text-(--foreground-subtle)">
                  Hoy tiene un monto fijo de {formatCurrency(row.fixed)}: si
                  escribes un porcentaje, lo reemplaza.
                </p>
              )}

              {overspent && (
                <p className="text-[12px] text-(--danger)">
                  Te pasaste por {formatCurrency(row.spent - (amount ?? 0))}.
                </p>
              )}

              {!hasSavings && (
                <button
                  type="button"
                  onClick={() => startTransition(async () => setSavingsCategory(row.id))}
                  className="self-start text-[12px] text-(--accent)"
                >
                  Marcar como mi ahorro
                </button>
              )}
            </div>
          );
        })}

        {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={saving || over}>
            {saving ? "Guardando…" : "Guardar reparto"}
          </Button>
          {leftover > 0 && (
            <Button type="button" variant="secondary" onClick={splitRest}>
              <Split size={ICON.sm} />
              Repartir el resto
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
