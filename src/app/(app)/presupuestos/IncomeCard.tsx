"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarDays, Landmark, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedToggle, type SegmentedOption } from "@/components/ui/SegmentedToggle";
import { formatMoneyParts } from "@/lib/money";
import { ICON } from "@/lib/icons";
import { MONTH_NAMES } from "@/lib/dates";
import {
  deleteMonthIncome,
  saveBaseIncome,
  saveMonthIncome,
  setIncomeMode,
  type ActionState,
} from "@/modules/income/actions";
import type { IncomeMode, IncomeSource } from "@/modules/income/resolve";

// Aquí se pone el sueldo. Es lo primero de la pantalla porque todo el reparto
// se calcula sobre esta cifra: sin ella, los porcentajes no son dinero.

const initialState: ActionState = { error: null };

// Etiquetas de una palabra: en un teléfono, "Cambia cada mes" no cabe en media
// pastilla sin partirse ni recortarse.
const MODES: SegmentedOption<IncomeMode>[] = [
  { value: "FIJO", label: "Fijo", icon: Landmark },
  { value: "VARIABLE", label: "Variable", icon: CalendarDays },
];

export function IncomeCard({
  month,
  year,
  mode,
  baseIncome,
  monthAmount,
  income,
  source,
}: {
  month: number;
  year: number;
  mode: IncomeMode;
  /** El sueldo base guardado, que en modo fijo vale para todos los meses. */
  baseIncome: number | null;
  /** La cifra capturada para este mes, si existe. */
  monthAmount: number | null;
  /** La que manda al final: la del mes si hay, o la base en modo fijo. */
  income: number | null;
  source: IncomeSource;
}) {
  // El modo se guarda en cuanto se toca, sin botón: es un interruptor, y
  // pedirle confirmación a un interruptor se siente roto.
  const [shown, setShown] = useState(mode);
  const [, startTransition] = useTransition();
  const [baseState, saveBase, savingBase] = useActionState(saveBaseIncome, initialState);
  const [monthState, saveMonth, savingMonth] = useActionState(saveMonthIncome, initialState);
  // En modo fijo el campo del mes está guardado: solo hace falta para el mes
  // del aguinaldo o la quincena corta.
  const [override, setOverride] = useState(monthAmount !== null);

  const money = income !== null ? formatMoneyParts(income) : null;
  const monthName = MONTH_NAMES[month - 1];

  function changeMode(next: IncomeMode) {
    setShown(next);
    startTransition(async () => setIncomeMode(next));
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-(--foreground-muted)">
            Para gastar en {monthName.toLowerCase()}
          </p>
          {money ? (
            <p className="mt-0.5 font-semibold leading-none tabular-nums">
              <span className="text-[32px] tracking-tight">
                {money.sign}
                {money.integer}
              </span>
              <span className="text-[16px] text-(--foreground-muted)">
                {money.decimalSeparator}
                {money.cents}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-[15px] text-(--warning)">Falta capturarlo</p>
          )}
          <p className="mt-1 text-[12px] text-(--foreground-subtle)">
            {source === "MES"
              ? `Capturado para ${monthName.toLowerCase()}`
              : source === "BASE"
                ? "Tu sueldo fijo"
                : "Sin esta cifra, los porcentajes no se calculan"}
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <SegmentedToggle
            label="Cómo llevas tu ingreso"
            value={shown}
            onChange={changeMode}
            options={MODES}
          />
          <p className="mt-1 text-[11px] text-(--foreground-subtle) sm:text-right">
            {shown === "FIJO"
              ? "El mismo sueldo todos los meses"
              : "Capturas lo que tienes cada mes"}
          </p>
        </div>
      </div>

      {shown === "FIJO" ? (
        <div className="flex flex-col gap-3">
          {/* Con dos campos de dinero en la misma tarjeta, el rótulo no es
              opcional: sin él no se sabe cuál es el sueldo y cuál la excepción
              del mes, porque en cuanto tienen valor el marcador de posición
              desaparece. */}
          <form action={saveBase} className="flex flex-wrap items-end gap-2">
            <Field className="min-w-0 flex-1">
              Sueldo mensual
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                defaultValue={baseIncome ?? ""}
                placeholder="Lo que ganas al mes"
              />
            </Field>
            <Button
              type="submit"
              variant="secondary"
              className="shrink-0"
              disabled={savingBase}
            >
              {savingBase ? "…" : "Guardar"}
            </Button>
          </form>
          {baseState.error && (
            <p className="text-[13px] text-(--danger)">{baseState.error}</p>
          )}

          {override ? (
            <MonthForm
              month={month}
              year={year}
              monthAmount={monthAmount}
              action={saveMonth}
              pending={savingMonth}
              error={monthState.error}
              label={`Solo para ${monthName.toLowerCase()}`}
              onDone={() => setOverride(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setOverride(true)}
              className="flex items-center gap-1.5 self-start text-[13px] text-(--accent)"
            >
              <Wallet size={ICON.sm} />
              Este mes fue distinto
            </button>
          )}
        </div>
      ) : (
        <MonthForm
          month={month}
          year={year}
          monthAmount={monthAmount}
          action={saveMonth}
          pending={savingMonth}
          error={monthState.error}
          label={`Lo que tienes para ${monthName.toLowerCase()}`}
        />
      )}
    </Card>
  );
}

// El mismo formulario sirve para el mes en modo variable y para la excepción del
// modo fijo: en los dos casos escribe la fila del mes, que es la que gana.
function MonthForm({
  month,
  year,
  monthAmount,
  action,
  pending,
  error,
  label,
  onDone,
}: {
  month: number;
  year: number;
  monthAmount: number | null;
  action: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  label: string;
  onDone?: () => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        <Field className="min-w-0 flex-1">
          {label}
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            defaultValue={monthAmount ?? ""}
            placeholder="0.00"
          />
        </Field>
        <Button type="submit" variant="secondary" className="shrink-0" disabled={pending}>
          {pending ? "…" : monthAmount !== null ? "Actualizar" : "Guardar"}
        </Button>
      </form>

      {monthAmount !== null && (
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await deleteMonthIncome(month, year);
              onDone?.();
            })
          }
          className="self-start text-[13px] text-(--foreground-muted)"
        >
          Quitar la cifra de este mes
        </button>
      )}

      {error && <p className="text-[13px] text-(--danger)">{error}</p>}
    </div>
  );
}
