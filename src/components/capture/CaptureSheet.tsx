"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, ChevronDown, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn, formatCurrency } from "@/lib/utils";
import { createQuickTransaction } from "@/modules/transactions/actions";
import {
  evaluateExpression,
  formatExpression,
  hasOperation,
} from "@/modules/transactions/expression";
import type { ActionState } from "@/lib/action-state";
import type {
  QuickCaptureData,
  QuickCategory,
} from "@/modules/transactions/quick-data";
import { AmountPad } from "./AmountPad";
import { CategoryPicker } from "./CategoryPicker";

const initialState: ActionState = { error: null };

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

// Cada apertura monta una instancia nueva (la llave se la pone el botón), así
// que el estado empieza limpio sin resetearlo a mano en un efecto: arrastrar el
// monto de la captura anterior es la forma más fácil de registrar un gasto
// equivocado.
export function CaptureSheet({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: QuickCaptureData;
}) {
  // Dos pasos en vez de un formulario largo: mientras se teclea el monto no
  // hay nada más en pantalla, que es lo que convierte el teclado en una
  // calculadora usable en lugar de un campo más.
  const [step, setStep] = useState<"monto" | "detalle">("monto");
  const [kind, setKind] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [expression, setExpression] = useState("");
  const [category, setCategory] = useState<QuickCategory | null>(null);
  const [path, setPath] = useState<QuickCategory[]>([]);
  const [accountId, setAccountId] = useState<string>("none");
  const [showDetails, setShowDetails] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createQuickTransaction(prev, formData);
      if (!result.error) onClose();
      return result;
    },
    initialState
  );

  // El total ya resuelto. Lo que viaja al servidor es esto, nunca la
  // expresión: z.coerce.number() convertiría "43+567" en NaN.
  const total = evaluateExpression(expression);
  const ready = total !== null && total > 0 && !!category;
  const budget = category
    ? data.budgets.find((item) => item.categoryId === category.id)
    : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "monto" ? "Monto" : "Nuevo movimiento"}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />
        <input
          type="hidden"
          name="amount"
          value={total !== null ? total.toFixed(2) : ""}
        />
        <input type="hidden" name="categoryId" value={category?.id ?? "none"} />
        <input type="hidden" name="accountId" value={accountId} />

        {step === "monto" ? (
          <>
            <div className="min-h-[68px] text-center">
              {hasOperation(expression) && (
                <p className="animate-fade mb-1 text-[15px] tabular-nums text-(--foreground-muted)">
                  {formatExpression(expression)}
                </p>
              )}
              <p
                className={cn(
                  "text-[40px] font-semibold leading-none tabular-nums",
                  expression ? "text-(--foreground)" : "text-(--foreground-subtle)"
                )}
              >
                {total !== null ? formatCurrency(total) : "$0"}
              </p>
            </div>

            <AmountPad value={expression} onChange={setExpression} />

            <Button
              type="button"
              disabled={total === null || total <= 0}
              onClick={() => setStep("detalle")}
            >
              <span className="flex items-center justify-center gap-1.5">
                Continuar
                <ArrowRight size={16} />
              </span>
            </Button>
          </>
        ) : (
          <>
            {/* El monto se queda a la vista y es el camino de regreso al
                teclado: es el dato que más se corrige. */}
            <button
              type="button"
              onClick={() => setStep("monto")}
              className="pressable flex items-center justify-between rounded-(--radius-md) bg-(--surface-2) px-3 py-2.5 text-left"
            >
              <span className="text-[24px] font-semibold tabular-nums">
                {total !== null ? formatCurrency(total) : "$0"}
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-(--foreground-subtle)">
                {hasOperation(expression) && formatExpression(expression)}
                <Pencil size={13} />
              </span>
            </button>

            <div className="flex gap-2">
              {(["EXPENSE", "INCOME"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={cn(
                    "pressable flex-1 rounded-(--radius-full) px-3 py-1.5 text-[13px] transition-colors",
                    kind === option
                      ? option === "EXPENSE"
                        ? "bg-(--danger)/15 text-(--danger)"
                        : "bg-(--success)/15 text-(--success)"
                      : "bg-(--surface-2) text-(--foreground-muted)"
                  )}
                >
                  {option === "EXPENSE" ? "Gasto" : "Ingreso"}
                </button>
              ))}
            </div>

            {/* Los atajos solo aparecen antes de elegir: después estorban. */}
            {!category && data.shortcuts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.shortcuts.map((shortcut) => (
                  <button
                    key={`${shortcut.categoryId}-${shortcut.accountId ?? "none"}`}
                    type="button"
                    onClick={() => {
                      const found = data.categories.find(
                        (item) => item.id === shortcut.categoryId
                      );
                      if (found) setCategory(found);
                      setAccountId(shortcut.accountId ?? "none");
                    }}
                    className="pressable flex items-center gap-1.5 rounded-(--radius-full) bg-(--surface-2) px-3 py-1.5 text-[12px] text-(--foreground)"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: shortcut.color }}
                    />
                    {shortcut.categoryName}
                    {shortcut.accountName ? ` · ${shortcut.accountName}` : ""}
                  </button>
                ))}
              </div>
            )}

            {category ? (
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setPath([]);
                }}
                className="pressable flex items-center justify-between rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2 text-[14px]">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: category.color }}
                  />
                  {category.name}
                </span>
                <span className="text-[12px] text-(--foreground-subtle)">Cambiar</span>
              </button>
            ) : (
              <CategoryPicker
                categories={data.categories}
                budgets={data.budgets}
                path={path}
                onNavigate={setPath}
                onPick={(picked) => setCategory(picked)}
              />
            )}

            {budget && (
              <div>
                <div className="mb-1 flex justify-between text-[12px] text-(--foreground-muted)">
                  <span>Presupuesto del mes</span>
                  <span>
                    {formatCurrency(budget.spent + (total ?? 0))} de{" "}
                    {formatCurrency(budget.limit)}
                  </span>
                </div>
                <ProgressBar
                  value={budget.spent + (total ?? 0)}
                  max={budget.limit}
                  semantics="limit"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="flex items-center gap-1 self-start text-[13px] text-(--foreground-muted)"
            >
              <ChevronDown
                size={14}
                className={cn("transition-transform", showDetails && "rotate-180")}
              />
              Más detalles
            </button>

            {/* Plegado por defecto: casi toda captura es de hoy, y la cuenta suele
                repetirse, así que pedirlas siempre solo añade toques. */}
            <div className={cn("flex flex-col gap-3", !showDetails && "hidden")}>
              <Field>
                Cuenta
                <Select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="none">Sin cuenta</option>
                  {data.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field>
                Fecha
                <Input type="date" name="date" defaultValue={todayValue()} />
              </Field>

              <Field>
                Descripción
                <Input name="description" placeholder="Opcional" maxLength={200} />
              </Field>
            </div>

            {!showDetails && <input type="hidden" name="date" value={todayValue()} />}

            {state.error && (
              <p className="text-[13px] text-(--danger)">{state.error}</p>
            )}

            <Button type="submit" disabled={!ready || pending}>
              {pending ? (
                "Guardando…"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Check size={16} />
                  {ready && total !== null
                    ? `Guardar ${formatCurrency(total)}`
                    : "Elige una categoría"}
                </span>
              )}
            </Button>
          </>
        )}
      </form>
    </Modal>
  );
}
