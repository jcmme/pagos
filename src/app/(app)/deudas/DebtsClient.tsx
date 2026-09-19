"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { DEBT_TYPE_LABELS } from "@/lib/constants";
import { ICON } from "@/lib/icons";
import {
  createDebt,
  updateDebt,
  deleteDebt,
  addDebtPayment,
  deleteDebtPayment,
  ActionState,
} from "@/modules/debts/actions";

type SerializedPayment = { id: string; amount: string; date: string; note: string | null };
type SerializedDebt = {
  id: string;
  name: string;
  counterparty: string | null;
  type: "OWE" | "OWED";
  totalAmount: string;
  interestRate: string | null;
  startDate: string;
  note: string | null;
  payments: SerializedPayment[];
};

const initialState: ActionState = { error: null };

function DebtForm({
  action,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: {
    name: string;
    counterparty: string;
    type: string;
    totalAmount: string;
    interestRate: string;
    startDate: string;
    note: string;
  };
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await action(prev, fd);
    if (!res.error) onSuccess();
    return res;
  }, initialState);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Nombre
        <Input name="name" required defaultValue={defaults?.name} placeholder="Ej. Préstamo carro" />
      </Field>
      <Field>
        Tipo
        <Select name="type" defaultValue={defaults?.type ?? "OWE"}>
          <option value="OWE">Yo debo</option>
          <option value="OWED">Me deben</option>
        </Select>
      </Field>
      <Field>
        Contraparte (opcional)
        <Input name="counterparty" defaultValue={defaults?.counterparty} placeholder="Ej. Banco, Juan" />
      </Field>
      <Field>
        Monto total
        <Input name="totalAmount" type="number" step="0.01" min="0.01" required defaultValue={defaults?.totalAmount} />
      </Field>
      <Field>
        Fecha de inicio
        <Input name="startDate" type="date" required defaultValue={defaults?.startDate ?? today} />
      </Field>
      <Field>
        Tasa de interés % (opcional)
        <Input name="interestRate" type="number" step="0.01" min="0" defaultValue={defaults?.interestRate} />
      </Field>
      <Field>
        Nota (opcional)
        <Textarea name="note" rows={2} defaultValue={defaults?.note} />
      </Field>
      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function PaymentForm({ debtId, onSuccess }: { debtId: string; onSuccess: () => void }) {
  const action = addDebtPayment.bind(null, debtId);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await action(prev, fd);
    if (!res.error) onSuccess();
    return res;
  }, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="Monto" />
        <Input name="date" type="date" required defaultValue={today} />
      </div>
      <Input name="note" placeholder="Nota (opcional)" />
      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Guardando…" : "Registrar abono"}
      </Button>
    </form>
  );
}

function DebtCard({ debt }: { debt: SerializedDebt }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const paid = debt.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(debt.totalAmount) - paid);
  const settled = remaining <= 0;

  return (
    <Card className="p-4">
      <button
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-medium">{debt.name}</p>
            <Badge tone={debt.type === "OWE" ? "danger" : "success"}>
              {DEBT_TYPE_LABELS[debt.type]}
            </Badge>
          </div>
          {debt.counterparty && (
            <p className="mt-0.5 text-[12px] text-(--foreground-subtle)">{debt.counterparty}</p>
          )}
        </div>
        <ChevronDown
          size={ICON.md}
          className={cn("shrink-0 text-(--foreground-subtle) transition-transform", open && "rotate-180")}
        />
      </button>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[13px] text-(--foreground-muted)">
          <span>{formatCurrency(remaining)} restante</span>
          <span>{formatCurrency(debt.totalAmount)} total</span>
        </div>
        <ProgressBar value={paid} max={Number(debt.totalAmount)} className="mt-1.5" semantics="goal" />
      </div>

      {settled && (
        <Badge tone="success" className="mt-3">
          Saldada
        </Badge>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-(--border) pt-4">
          <PaymentForm debtId={debt.id} onSuccess={() => {}} />

          {debt.payments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium text-(--foreground-muted)">Abonos</p>
              {debt.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-(--radius-sm) bg-(--surface-2) px-3 py-2 text-[13px]"
                >
                  <span className="text-(--foreground-muted)">{formatDate(p.date)}</span>
                  <span className="truncate px-2">{p.note ?? "—"}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(p.amount)}</span>
                    <button
                      onClick={() => deleteDebtPayment(p.id)}
                      className="text-(--foreground-subtle) hover:text-(--danger)"
                      aria-label="Eliminar abono"
                    >
                      <Trash2 size={ICON.sm} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[13px] text-(--foreground-muted) hover:text-(--foreground)"
            >
              <Pencil size={ICON.sm} /> Editar
            </button>
            <button
              onClick={() => deleteDebt(debt.id)}
              className="flex items-center gap-1 text-[13px] text-(--foreground-muted) hover:text-(--danger)"
            >
              <Trash2 size={ICON.sm} /> Eliminar
            </button>
          </div>
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar deuda">
        <DebtForm
          action={updateDebt.bind(null, debt.id)}
          defaults={{
            name: debt.name,
            counterparty: debt.counterparty ?? "",
            type: debt.type,
            totalAmount: debt.totalAmount,
            interestRate: debt.interestRate ?? "",
            startDate: debt.startDate.slice(0, 10),
            note: debt.note ?? "",
          }}
          submitLabel="Guardar cambios"
          onSuccess={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}

export function DebtsClient({ debts }: { debts: SerializedDebt[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={ICON.md} /> Nueva deuda
        </Button>
      </div>

      <div className="stagger flex flex-col gap-2">
        {debts.map((d) => (
          <DebtCard key={d.id} debt={d} />
        ))}
        {debts.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">No tienes deudas registradas.</p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nueva deuda">
        <DebtForm action={createDebt} submitLabel="Crear" onSuccess={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
