"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, Download, SlidersHorizontal, Upload } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SwitchRow } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TagsInput } from "@/components/ui/TagsInput";
import { CategorySelect, categoryLabel, type CategoryOption } from "@/components/ui/CategorySelect";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TX_KIND_LABELS } from "@/lib/constants";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type ActionState,
} from "@/modules/transactions/actions";
import type { TransactionFilter } from "@/modules/transactions/schema";
import { ICON } from "@/lib/icons";
import { todayISO } from "@/lib/dates";
import { IconButton } from "@/components/ui/IconButton";

type Tx = {
  id: string;
  kind: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: string;
  date: string;
  description: string | null;
  note: string | null;
  categoryId: string | null;
  accountId: string | null;
  transferAccountId: string | null;
  excludeFromStats: boolean;
  category: (CategoryOption & { parent: { id: string; name: string } | null }) | null;
  account: { id: string; name: string } | null;
  tags: { id: string; name: string; slug: string }[];
};

type AccountOption = { id: string; name: string };

const initialState: ActionState = { error: null };

function TransactionForm({
  action,
  categories,
  accounts,
  tagSuggestions,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  accounts: AccountOption[];
  tagSuggestions: string[];
  defaults?: Partial<Tx>;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [kind, setKind] = useState(defaults?.kind ?? "EXPENSE");
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (!result.error) onSuccess();
    return result;
  }, initialState);

  const today = todayISO();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Tipo
        <Select name="kind" value={kind} onChange={(event) => setKind(event.target.value as Tx["kind"])}>
          <option value="EXPENSE">Gasto</option>
          <option value="INCOME">Ingreso</option>
          <option value="TRANSFER">Transferencia</option>
        </Select>
      </Field>

      <Field>
        Monto
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={defaults?.amount}
        />
      </Field>

      <Field>
        Fecha
        <Input
          name="date"
          type="date"
          required
          defaultValue={defaults?.date?.slice(0, 10) ?? today}
        />
      </Field>

      {kind !== "TRANSFER" && (
        <Field>
          Categoría
          <CategorySelect categories={categories} defaultValue={defaults?.categoryId ?? "none"} />
        </Field>
      )}

      <Field>
        {kind === "TRANSFER" ? "Cuenta de origen" : "Cuenta"}
        <Select name="accountId" defaultValue={defaults?.accountId ?? "none"}>
          <option value="none">Sin cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      {kind === "TRANSFER" && (
        <Field>
          Cuenta de destino
          <Select name="transferAccountId" defaultValue={defaults?.transferAccountId ?? "none"}>
            <option value="none">Selecciona…</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field>
        Descripción
        <Input
          name="description"
          defaultValue={defaults?.description ?? ""}
          placeholder="Ej. Súper de la semana"
        />
      </Field>

      <Field>
        Etiquetas
        <TagsInput
          defaultTags={defaults?.tags?.map((tag) => tag.name) ?? []}
          suggestions={tagSuggestions}
        />
      </Field>

      <Field>
        Nota (opcional)
        <Textarea name="note" rows={2} defaultValue={defaults?.note ?? ""} />
      </Field>

      <SwitchRow
        name="excludeFromStats"
        defaultChecked={defaults?.excludeFromStats}
        label="Excluir de estadísticas"
        hint="No cuenta en tus métricas ni en tus presupuestos."
      />

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function FilterPanel({
  categories,
  accounts,
  tags,
  filter,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
  tags: { slug: string; name: string }[];
  filter: TransactionFilter;
}) {
  // Los filtros viajan por querystring en un form GET: así la URL es
  // compartible y el servidor puede renderizar sin estado de cliente.
  return (
    <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Field className="col-span-2 sm:col-span-3">
        Buscar
        <Input name="q" defaultValue={filter.q ?? ""} placeholder="Comercio, nota o categoría" />
      </Field>

      <Field>
        Tipo
        <Select name="kind" defaultValue={filter.kind ?? ""}>
          <option value="">Todos</option>
          <option value="EXPENSE">Gastos</option>
          <option value="INCOME">Ingresos</option>
          <option value="TRANSFER">Transferencias</option>
        </Select>
      </Field>

      <Field>
        Categoría
        <CategorySelect
          categories={categories}
          defaultValue={filter.categoryId ?? "none"}
          includeNone
        />
      </Field>

      <Field>
        Cuenta
        <Select name="accountId" defaultValue={filter.accountId ?? ""}>
          <option value="">Todas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        Etiqueta
        <Select name="tag" defaultValue={filter.tag ?? ""}>
          <option value="">Todas</option>
          {tags.map((tag) => (
            <option key={tag.slug} value={tag.slug}>
              #{tag.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        Desde
        <Input name="from" type="date" defaultValue={filter.from ?? ""} />
      </Field>

      <Field>
        Hasta
        <Input name="to" type="date" defaultValue={filter.to ?? ""} />
      </Field>

      <Field>
        Monto mínimo
        <Input name="minAmount" type="number" step="0.01" defaultValue={filter.minAmount ?? ""} />
      </Field>

      <Field>
        Monto máximo
        <Input name="maxAmount" type="number" step="0.01" defaultValue={filter.maxAmount ?? ""} />
      </Field>

      <div className="col-span-2 flex gap-2 sm:col-span-3">
        <Button type="submit" className="flex-1">
          Aplicar
        </Button>
        <Link href="/movimientos" className="flex-1">
          <Button type="button" variant="secondary" className="w-full">
            Limpiar
          </Button>
        </Link>
      </div>
    </form>
  );
}

export function TransactionsClient({
  transactions,
  categories,
  accounts,
  tags,
  totals,
  filter,
  truncated,
}: {
  transactions: Tx[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  tags: { id: string; name: string; slug: string }[];
  totals: { expenses: number; income: number };
  filter: TransactionFilter;
  truncated: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const exportHref = `/api/export?${new URLSearchParams(
    Object.entries(filter).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== "") acc[key] = String(value);
      return acc;
    }, {})
  ).toString()}`;

  const tagSuggestions = tags.map((tag) => tag.name);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Movimientos</h1>
        <div className="flex gap-2">
          <Link href="/importar">
            <Button variant="secondary" className="gap-1.5">
              <Upload size={ICON.md} /> Importar
            </Button>
          </Link>
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus size={ICON.md} /> Nuevo
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-(--foreground-muted)">Gastos</p>
            <p className="text-[22px] font-semibold">{formatCurrency(totals.expenses)}</p>
          </div>
          <div>
            <p className="text-[13px] text-(--foreground-muted)">Ingresos</p>
            <p className="text-[22px] font-semibold text-(--success)">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-(--foreground-muted)">Balance</p>
            <p
              className={`text-[22px] font-semibold ${
                totals.income - totals.expenses < 0 ? "text-(--danger)" : ""
              }`}
            >
              {formatCurrency(totals.income - totals.expenses)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFilters((value) => !value)}
              className="gap-1.5"
            >
              <SlidersHorizontal size={ICON.md} /> Filtros
            </Button>
            <a href={exportHref}>
              <Button variant="secondary" className="gap-1.5">
                <Download size={ICON.md} /> CSV
              </Button>
            </a>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-(--border) pt-4">
            <FilterPanel
              categories={categories}
              accounts={accounts}
              tags={tags}
              filter={filter}
            />
          </div>
        )}
      </Card>

      <div className="stagger flex flex-col gap-2">
        {transactions.map((tx) => (
          <Card key={tx.id} className="flex items-center justify-between p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: tx.category?.color ?? "#6e6e73" }}
              />
              <div className="min-w-0">
                <p className="truncate text-[14px]">
                  {tx.description || tx.note || TX_KIND_LABELS[tx.kind]}
                </p>
                <p className="truncate text-[12px] text-(--foreground-subtle)">
                  {formatDate(tx.date)} · {categoryLabel(tx.category)}
                  {tx.account ? ` · ${tx.account.name}` : ""}
                </p>
                {tx.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tx.tags.map((tag) => (
                      <span key={tag.id} className="text-[11px] text-(--accent)">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`text-[15px] font-medium ${
                  tx.kind === "INCOME" ? "text-(--success)" : ""
                }`}
              >
                {tx.kind === "INCOME" ? "+" : tx.kind === "EXPENSE" ? "−" : ""}
                {formatCurrency(tx.amount)}
              </span>
              <IconButton
                onClick={() => setEditing(tx)}
                aria-label="Editar"
              >
                <Pencil size={ICON.md} />
              </IconButton>
              <IconButton
                onClick={() => deleteTransaction(tx.id)}
                tone="danger"
                aria-label="Eliminar"
              >
                <Trash2 size={ICON.md} />
              </IconButton>
            </div>
          </Card>
        ))}

        {transactions.length === 0 && (
          <p className="text-[13px] text-(--foreground-muted)">
            No hay movimientos que coincidan con estos filtros.
          </p>
        )}

        {truncated && (
          <Badge tone="neutral" className="self-center">
            Mostrando los 150 más recientes. Afina los filtros para ver el resto.
          </Badge>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo movimiento">
        <TransactionForm
          action={createTransaction}
          categories={categories}
          accounts={accounts}
          tagSuggestions={tagSuggestions}
          submitLabel="Guardar"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar movimiento">
        {editing && (
          <TransactionForm
            action={updateTransaction.bind(null, editing.id)}
            categories={categories}
            accounts={accounts}
            tagSuggestions={tagSuggestions}
            defaults={editing}
            submitLabel="Guardar cambios"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
