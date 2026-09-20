"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/utils";
import { upsertBudget, deleteBudget, ActionState } from "@/modules/budgets/actions";
import { ICON } from "@/lib/icons";

type Row = {
  category: {
    id: string;
    name: string;
    color: string;
    parentId: string | null;
    parent: { name: string } | null;
  };
  budget: { id: string; amount: string } | null;
  /** El límite ya resuelto, con el ajuste del mes sumado. null = en pausa. */
  limit: number | null;
  spent: number;
};

const initialState: ActionState = { error: null };

function BudgetRow({ row, month, year }: { row: Row; month: number; year: number }) {
  const [state, formAction, pending] = useActionState(upsertBudget, initialState);
  // El límite viene resuelto del servidor: no se lee el monto crudo, que con un
  // ajuste del mes ya no sería el límite real.
  const limit = row.limit;
  const over = limit !== null && row.spent > limit;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.category.color }} />
          <p className="text-[15px] font-medium">
            {row.category.parent && (
              <span className="text-(--foreground-subtle)">{row.category.parent.name} › </span>
            )}
            {row.category.name}
          </p>
        </div>
        <p className={`text-[13px] ${over ? "text-(--danger)" : "text-(--foreground-muted)"}`}>
          {formatCurrency(row.spent)} {limit !== null && `/ ${formatCurrency(limit)}`}
        </p>
      </div>

      {limit !== null && limit > 0 && (
        <ProgressBar value={row.spent} max={limit} className="mb-3" />
      )}

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="categoryId" value={row.category.id} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={row.budget?.amount}
          placeholder="Límite mensual"
          // Sin min-w-0 el campo no baja de su ancho por omisión (unas veinte
          // letras) y empuja el botón de borrar fuera de la pantalla.
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" className="shrink-0" disabled={pending}>
          {pending ? "…" : row.budget ? "Actualizar" : "Definir"}
        </Button>
        {row.budget && (
          <button
            type="button"
            onClick={() => deleteBudget(row.budget!.id)}
            className="shrink-0 rounded-full p-2 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
            aria-label="Eliminar presupuesto"
          >
            <Trash2 size={ICON.sm} />
          </button>
        )}
      </form>
      {state.error && <p className="mt-2 text-[13px] text-(--danger)">{state.error}</p>}
    </Card>
  );
}

export function BudgetsClient({ rows, month, year }: { rows: Row[]; month: number; year: number }) {
  if (rows.length === 0) {
    return (
      <p className="text-[14px] text-(--foreground-muted)">
        Crea categorías primero para poder definir presupuestos.
      </p>
    );
  }

  return (
    <div className="stagger flex flex-col gap-2">
      {rows.map((row) => (
        <BudgetRow key={row.category.id} row={row} month={month} year={year} />
      ))}
    </div>
  );
}
