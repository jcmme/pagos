"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";
import { ICON } from "@/lib/icons";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution,
  deleteContribution,
  type ActionState,
} from "@/modules/goals/actions";

type Contribution = { id: string; amount: string; date: string; note: string | null };
type Goal = {
  id: string;
  name: string;
  targetAmount: string;
  targetDate: string | null;
  accountId: string | null;
  color: string;
  contributions: Contribution[];
  account: { name: string } | null;
};

const initialState: ActionState = { error: null };

function GoalForm({
  action,
  accounts,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  accounts: { id: string; name: string }[];
  defaults?: Goal;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (!result.error) onSuccess();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Nombre
        <Input name="name" required defaultValue={defaults?.name} placeholder="Ej. Fondo de emergencia" />
      </Field>
      <Field>
        Monto objetivo
        <Input
          name="targetAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={defaults?.targetAmount}
        />
      </Field>
      <Field>
        Fecha objetivo (opcional)
        <Input name="targetDate" type="date" defaultValue={defaults?.targetDate?.slice(0, 10) ?? ""} />
      </Field>
      <Field>
        Cuenta donde ahorras (opcional)
        <Select name="accountId" defaultValue={defaults?.accountId ?? "none"}>
          <option value="none">Sin cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        Color
        <Select name="color" defaultValue={defaults?.color ?? "#30d158"}>
          {CATEGORY_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
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

function ContributionForm({ goalId }: { goalId: string }) {
  const action = addContribution.bind(null, goalId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" type="number" step="0.01" min="0.01" required placeholder="Monto" />
        <Input name="date" type="date" required defaultValue={today} />
      </div>
      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Guardando…" : "Abonar a la meta"}
      </Button>
    </form>
  );
}

function GoalCard({
  goal,
  accounts,
  monthsRemaining,
}: {
  goal: Goal;
  accounts: { id: string; name: string }[];
  monthsRemaining: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const saved = goal.contributions.reduce(
    (sum, contribution) => sum + Number(contribution.amount),
    0
  );
  const target = Number(goal.targetAmount);
  const remaining = Math.max(0, target - saved);
  const done = remaining <= 0;

  // Cuánto habría que apartar cada mes para llegar a tiempo. Los meses
  // restantes llegan ya calculados del servidor.
  const monthlyNeeded = monthsRemaining && !done ? remaining / monthsRemaining : null;

  return (
    <Card className="p-4">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: goal.color }} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{goal.name}</p>
            {goal.targetDate && (
              <p className="text-[12px] text-(--foreground-subtle)">
                Para {formatDate(goal.targetDate)}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          size={ICON.md}
          className={cn("shrink-0 text-(--foreground-subtle) transition-transform", open && "rotate-180")}
        />
      </button>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[13px] text-(--foreground-muted)">
          <span>{formatCurrency(saved)} ahorrado</span>
          <span>{formatCurrency(target)} meta</span>
        </div>
        <ProgressBar value={saved} max={target} className="mt-1.5" semantics="goal" />
        {done ? (
          <Badge tone="success" className="mt-3">
            ¡Meta cumplida!
          </Badge>
        ) : (
          <p className="mt-2 text-[12px] text-(--foreground-subtle)">
            Te faltan {formatCurrency(remaining)}
            {monthlyNeeded
              ? ` · aparta ${formatCurrency(monthlyNeeded)} al mes para llegar a tiempo`
              : ""}
          </p>
        )}
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-(--border) pt-4">
          <ContributionForm goalId={goal.id} />

          {goal.contributions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {goal.contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between rounded-(--radius-sm) bg-(--surface-2) px-3 py-2 text-[13px]"
                >
                  <span className="text-(--foreground-muted)">{formatDate(contribution.date)}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(contribution.amount)}</span>
                    <button
                      onClick={() => deleteContribution(contribution.id)}
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

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[13px] text-(--foreground-muted) hover:text-(--foreground)"
            >
              <Pencil size={ICON.sm} /> Editar
            </button>
            <button
              onClick={() => deleteGoal(goal.id)}
              className="flex items-center gap-1 text-[13px] text-(--foreground-muted) hover:text-(--danger)"
            >
              <Trash2 size={ICON.sm} /> Eliminar
            </button>
          </div>
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Editar meta">
        <GoalForm
          action={updateGoal.bind(null, goal.id)}
          accounts={accounts}
          defaults={goal}
          submitLabel="Guardar cambios"
          onSuccess={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}

export function GoalsClient({
  goals,
  accounts,
  monthsRemaining,
}: {
  goals: Goal[];
  accounts: { id: string; name: string }[];
  monthsRemaining: Record<string, number | null>;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Metas de ahorro</h1>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={ICON.md} /> Nueva meta
        </Button>
      </div>

      <div className="stagger flex flex-col gap-2">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            accounts={accounts}
            monthsRemaining={monthsRemaining[goal.id] ?? null}
          />
        ))}
        {goals.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            Define una meta (fondo de emergencia, un viaje, un enganche) y ve cuánto te falta
            cada mes para llegar.
          </p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nueva meta">
        <GoalForm
          action={createGoal}
          accounts={accounts}
          submitLabel="Crear"
          onSuccess={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}
