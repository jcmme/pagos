"use client";

import { useActionState, useMemo, useState } from "react";
import Papa from "papaparse";
import type { Category } from "@prisma/client";
import { Plus, Upload, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  importExpenses,
  ActionState,
} from "@/modules/expenses/actions";

type SerializedExpense = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryId: string | null;
  category: Category | null;
};

const initialState: ActionState = { error: null };

function CategorySelect({
  categories,
  defaultValue,
  value,
  onChange,
}: {
  categories: Category[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <Select
      name="categoryId"
      defaultValue={onChange ? undefined : defaultValue ?? "none"}
      value={onChange ? value : undefined}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      <option value="none">Sin categoría</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  );
}

function ExpenseForm({
  action,
  categories,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  defaults?: { amount: string; date: string; note: string; categoryId: string };
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
        Monto
        <Input name="amount" type="number" step="0.01" min="0.01" required defaultValue={defaults?.amount} placeholder="0" />
      </Field>
      <Field>
        Fecha
        <Input name="date" type="date" required defaultValue={defaults?.date ?? today} />
      </Field>
      <Field>
        Categoría
        <CategorySelect categories={categories} defaultValue={defaults?.categoryId} />
      </Field>
      <Field>
        Nota (opcional)
        <Textarea name="note" rows={2} defaultValue={defaults?.note} placeholder="Ej. Mercado del mes" />
      </Field>
      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

type ParsedRow = { date: string; amount: number; note?: string };

function ImportModal({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [categoryId, setCategoryId] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function handleFile(file: File) {
    setError(null);
    setDone(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed: ParsedRow[] = [];
        for (const row of result.data) {
          const keys = Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
          );
          const dateRaw = keys["fecha"] ?? keys["date"];
          const amountRaw = keys["monto"] ?? keys["amount"];
          const note = keys["nota"] ?? keys["note"] ?? keys["descripcion"] ?? keys["description"];
          const amount = Number(String(amountRaw ?? "").replace(/[^0-9.-]/g, ""));
          const date = new Date(dateRaw ?? "");
          if (!dateRaw || Number.isNaN(amount) || Number.isNaN(date.getTime())) continue;
          parsed.push({ date: date.toISOString().slice(0, 10), amount, note });
        }
        if (parsed.length === 0) {
          setError("No se encontraron filas válidas. Usa columnas 'fecha' y 'monto'.");
        }
        setRows(parsed);
      },
      error: () => setError("No se pudo leer el archivo."),
    });
  }

  async function handleConfirm() {
    setImporting(true);
    const result = await importExpenses(
      rows.map((r) => ({
        date: r.date,
        amount: r.amount,
        note: r.note,
        categoryId: categoryId === "none" ? null : categoryId,
      }))
    );
    setImporting(false);
    setDone(result.imported);
    setRows([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar gastos desde CSV">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-(--foreground-muted)">
          El archivo debe tener columnas <code>fecha</code> y <code>monto</code> (y
          opcionalmente <code>nota</code>).
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-[13px] text-(--foreground-muted)"
        />
        {error && <p className="text-[13px] text-(--danger)">{error}</p>}
        {done !== null && (
          <p className="text-[13px] text-(--success)">{done} gastos importados.</p>
        )}
        {rows.length > 0 && (
          <>
            <Field>
              Asignar categoría a todos
              <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
            </Field>
            <div className="max-h-56 overflow-y-auto rounded-(--radius-md) border border-(--border)">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between border-b border-(--border) px-3 py-2 text-[13px] last:border-0"
                >
                  <span className="text-(--foreground-muted)">{r.date}</span>
                  <span className="truncate px-2">{r.note ?? "—"}</span>
                  <span>{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleConfirm} disabled={importing}>
              {importing ? "Importando…" : `Importar ${rows.length} gastos`}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

export function ExpensesClient({
  expenses,
  categories,
  total,
}: {
  expenses: SerializedExpense[];
  categories: Category[];
  total: number;
}) {
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<SerializedExpense | null>(null);

  const onImportSelect = useMemo(
    () => () => {
      setImporting(true);
    },
    []
  );

  return (
    <div>
      <Card className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-(--foreground-muted)">Total del mes</p>
          <p className="text-[26px] font-semibold">{formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onImportSelect} className="gap-1.5">
            <Upload size={16} /> Importar
          </Button>
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus size={17} /> Nuevo
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {expenses.map((e) => (
          <Card key={e.id} className="flex items-center justify-between p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: e.category?.color ?? "#6e6e73" }}
              />
              <div className="min-w-0">
                <p className="truncate text-[14px]">{e.note || e.category?.name || "Gasto"}</p>
                <p className="text-[12px] text-(--foreground-subtle)">
                  {formatDate(e.date)} · {e.category?.name ?? "Sin categoría"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[15px] font-medium">{formatCurrency(e.amount)}</span>
              <button
                onClick={() => setEditing(e)}
                className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
                aria-label="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteExpense(e.id)}
                className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
        {expenses.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            No hay gastos registrados este mes.
          </p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo gasto">
        <ExpenseForm
          action={createExpense}
          categories={categories}
          submitLabel="Guardar"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar gasto">
        {editing && (
          <ExpenseForm
            action={updateExpense.bind(null, editing.id)}
            categories={categories}
            defaults={{
              amount: editing.amount,
              date: editing.date.slice(0, 10),
              note: editing.note ?? "",
              categoryId: editing.categoryId ?? "none",
            }}
            submitLabel="Guardar cambios"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>

      <ImportModal open={importing} onClose={() => setImporting(false)} categories={categories} />
    </div>
  );
}
