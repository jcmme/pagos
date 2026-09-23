"use client";

import { useActionState, useState } from "react";
import type { CategoryOption } from "@/components/ui/CategorySelect";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { CategorySelect, categoryLabel } from "@/components/ui/CategorySelect";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { FREQUENCY_LABELS, MONTH_NAMES_SHORT } from "@/lib/constants";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { ICON } from "@/lib/icons";
import { IconButton } from "@/components/ui/IconButton";
import {
  createFixedPayment,
  updateFixedPayment,
  deleteFixedPayment,
  toggleFixedPaymentActive,
  markFixedPaymentPaid,
  ActionState,
} from "@/modules/fixed-payments/actions";

type SerializedPayment = {
  id: string;
  name: string;
  amount: string;
  kind: "EXPENSE" | "INCOME";
  dueDay: number;
  dueMonth: number | null;
  frequency: "MONTHLY" | "WEEKLY" | "YEARLY";
  active: boolean;
  categoryId: string | null;
  category: {
    name: string;
    color: string;
    parent: { name: string; parent: { name: string } | null } | null;
  } | null;
  accountId: string | null;
  account: { id: string; name: string } | null;
};

export type AccountOption = { id: string; name: string };

const initialState: ActionState = { error: null };
const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function PaymentForm({
  action,
  categories,
  accounts,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  accounts: AccountOption[];
  defaults?: {
    name: string;
    amount: string;
    kind: string;
    dueDay: number;
    dueMonth: number | null;
    frequency: string;
    categoryId: string;
    accountId: string;
  };
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [frequency, setFrequency] = useState(defaults?.frequency ?? "MONTHLY");
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await action(prev, fd);
    if (!res.error) onSuccess();
    return res;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Nombre
        <Input name="name" required defaultValue={defaults?.name} placeholder="Ej. Arriendo" />
      </Field>
      <Field>
        Monto
        <Input name="amount" type="number" step="0.01" min="0.01" required defaultValue={defaults?.amount} />
      </Field>
      <Field>
        Tipo
        <Select name="kind" defaultValue={defaults?.kind ?? "EXPENSE"}>
          <option value="EXPENSE">Pago que hago</option>
          <option value="INCOME">Ingreso que recibo</option>
        </Select>
        <span className="text-[12px] text-(--foreground-subtle)">
          Los ingresos fijos (tu sueldo) no generan recordatorios; sirven para calcular
          cuánto tienes disponible hasta el próximo depósito.
        </span>
      </Field>

      <Field>
        Frecuencia
        <Select name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="MONTHLY">Mensual</option>
          <option value="WEEKLY">Semanal</option>
          <option value="YEARLY">Anual</option>
        </Select>
      </Field>

      {frequency === "MONTHLY" && (
        <Field>
          Día del mes
          <Input name="dueDay" type="number" min={1} max={31} required defaultValue={defaults?.dueDay} />
        </Field>
      )}

      {frequency === "WEEKLY" && (
        <Field>
          Día de la semana
          <Select name="dueDay" defaultValue={defaults?.dueDay ?? 1}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {frequency === "YEARLY" && (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            Día
            <Input name="dueDay" type="number" min={1} max={31} required defaultValue={defaults?.dueDay} />
          </Field>
          <Field>
            Mes
            <Select name="dueMonth" defaultValue={defaults?.dueMonth ?? 1}>
              {MONTH_NAMES_SHORT.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field>
        Categoría
        <CategorySelect
          categories={categories}
          defaultValue={defaults?.categoryId ?? "none"}
        />
      </Field>

      <Field>
        Cuenta con la que se paga
        <Select name="accountId" defaultValue={defaults?.accountId ?? "none"}>
          <option value="none">Sin definir</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function urgencyTone(days: number): "danger" | "warning" | "accent" | "neutral" {
  if (days <= 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "accent";
  return "neutral";
}

function urgencyLabel(days: number) {
  if (days < 0) return `Vencido hace ${Math.abs(days)}d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `En ${days} días`;
}

export function FixedPaymentsClient({
  payments,
  categories,
  accounts,
}: {
  payments: SerializedPayment[];
  categories: CategoryOption[];
  accounts: AccountOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SerializedPayment | null>(null);

  const sorted = [...payments].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const dA = daysUntil(computeNextDueDate(a));
    const dB = daysUntil(computeNextDueDate(b));
    return dA - dB;
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={ICON.md} /> Nuevo pago fijo
        </Button>
      </div>

      <div className="stagger flex flex-col gap-2">
        {sorted.map((p) => {
          const next = computeNextDueDate(p);
          const days = daysUntil(next);
          return (
            <Card key={p.id} className={`p-4 ${!p.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: p.category?.color ?? "#6e6e73" }}
                    />
                    <p className="truncate text-[15px] font-medium">{p.name}</p>
                  </div>
                  <p className="mt-1 text-[12px] text-(--foreground-subtle)">
                    {p.kind === "INCOME" ? "Ingreso · " : ""}
                    {FREQUENCY_LABELS[p.frequency]} · {categoryLabel(p.category)}
                    {p.account ? ` · ${p.account.name}` : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-[15px] font-medium ${
                    p.kind === "INCOME" ? "text-(--success)" : ""
                  }`}
                >
                  {p.kind === "INCOME" ? "+" : ""}
                  {formatCurrency(p.amount)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {p.active ? (
                  <Badge tone={urgencyTone(days)}>{urgencyLabel(days)}</Badge>
                ) : (
                  <Badge tone="neutral">Pausado</Badge>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => markFixedPaymentPaid(p.id)}
                    className="flex items-center gap-1 rounded-(--radius-full) bg-(--surface-2) px-2.5 py-1 text-[13px] text-(--foreground-muted) hover:text-(--success)"
                    title="Marcar como pagado"
                  >
                    <Check size={ICON.sm} /> Pagado
                  </button>
                  <button
                    onClick={() => toggleFixedPaymentActive(p.id, !p.active)}
                    className="rounded-(--radius-full) bg-(--surface-2) px-2.5 py-1 text-[13px] text-(--foreground-muted)"
                  >
                    {p.active ? "Pausar" : "Activar"}
                  </button>
                  <IconButton
                    onClick={() => setEditing(p)}
                    aria-label="Editar"
                  >
                    <Pencil size={ICON.md} />
                  </IconButton>
                  <IconButton
                    onClick={() => deleteFixedPayment(p.id)}
                    tone="danger"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={ICON.md} />
                  </IconButton>
                </div>
              </div>
            </Card>
          );
        })}
        {payments.length === 0 && (
          <p className="text-[13px] text-(--foreground-muted)">
            No tienes pagos fijos registrados.
          </p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo pago fijo">
        <PaymentForm
          accounts={accounts}
          action={createFixedPayment}
          categories={categories}
          submitLabel="Crear"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar pago fijo">
        {editing && (
          <PaymentForm
            accounts={accounts}
            action={updateFixedPayment.bind(null, editing.id)}
            categories={categories}
            defaults={{
              name: editing.name,
              amount: editing.amount,
              kind: editing.kind,
              dueDay: editing.dueDay,
              dueMonth: editing.dueMonth,
              frequency: editing.frequency,
              categoryId: editing.categoryId ?? "none",
              accountId: editing.accountId ?? "none",
            }}
            submitLabel="Guardar cambios"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
