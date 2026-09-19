"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, ChevronLeft, RefreshCw, AlertTriangle, Copy } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CategorySelect, type CategoryOption } from "@/components/ui/CategorySelect";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ICON } from "@/lib/icons";
import {
  approveStaged,
  recategorizeStaged,
  setStagedStatus,
  reapplyRules,
} from "@/modules/statements/actions";

type Row = {
  id: string;
  rowIndex: number;
  rawDescription: string;
  date: string;
  amount: string;
  kind: "EXPENSE" | "INCOME" | "TRANSFER";
  merchantKey: string | null;
  suggestedCategoryId: string | null;
  matchedRuleId: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DUPLICATE";
  duplicateOfId: string | null;
};

type ImportRecord = {
  id: string;
  fileName: string;
  status: string;
  error: string | null;
  account: { id: string; name: string } | null;
  rows: Row[];
};

export function ReviewClient({
  record,
  categories,
  reconciliation,
}: {
  record: ImportRecord;
  categories: CategoryOption[];
  reconciliation: { expected: number; actual: number } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Guarda si el usuario pidió crear regla para cada fila que corrigió.
  const [learnFor, setLearnFor] = useState<Set<string>>(new Set());

  const toReview = record.rows.filter(
    (row) => row.status === "PENDING" || row.status === "DUPLICATE"
  );
  const approved = record.rows.filter((row) => row.status === "APPROVED");

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(action: () => Promise<{ error: string | null } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
      else setSelected(new Set());
    });
  }

  const allSelected = toReview.length > 0 && selected.size === toReview.length;

  return (
    <div>
      <Link
        href="/importar"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-(--foreground-muted) hover:text-(--foreground)"
      >
        <ChevronLeft size={ICON.sm} /> Importaciones
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[24px] font-semibold">{record.fileName}</h1>
          <p className="text-[13px] text-(--foreground-muted)">
            {toReview.length} por revisar · {approved.length} aprobados
            {record.account ? ` · ${record.account.name}` : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => reapplyRules(record.id))}
          className="gap-1.5"
        >
          <RefreshCw size={ICON.sm} /> Reaplicar reglas
        </Button>
      </div>

      {record.error && (
        <Card className="mb-4 border-(--danger)/40">
          <p className="text-[13px] text-(--danger)">{record.error}</p>
        </Card>
      )}

      {reconciliation && Math.abs(reconciliation.expected - reconciliation.actual) > 0.5 && (
        <Card className="mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={ICON.md} className="mt-0.5 shrink-0 text-(--warning)" />
            <div>
              <CardTitle>Los saldos no cuadran</CardTitle>
              <p className="mt-1 text-[13px] text-(--foreground-muted)">
                Según el estado de cuenta el movimiento neto fue{" "}
                {formatCurrency(reconciliation.expected)}, pero lo aprobado suma{" "}
                {formatCurrency(reconciliation.actual)}. Puede que falten movimientos por
                aprobar.
              </p>
            </div>
          </div>
        </Card>
      )}

      {toReview.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[13px] text-(--foreground-muted)">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(toReview.map((row) => row.id)))
              }
              className="h-4 w-4 accent-(--accent)"
            />
            Seleccionar todo
          </label>

          <div className="flex gap-2">
            <Button
              disabled={pending || selected.size === 0}
              onClick={() => run(() => approveStaged([...selected]))}
              className="gap-1.5"
            >
              <Check size={ICON.md} /> Aprobar {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="mb-3 text-[13px] text-(--danger)">{error}</p>}

      <div className="flex flex-col gap-2">
        {toReview.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-(--accent)"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px]">{row.rawDescription}</p>
                    <p className="text-[12px] text-(--foreground-subtle)">
                      {formatDate(row.date)}
                      {row.merchantKey ? ` · ${row.merchantKey}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[15px] font-medium ${
                      row.kind === "INCOME" ? "text-(--success)" : ""
                    }`}
                  >
                    {row.kind === "INCOME" ? "+" : "−"}
                    {formatCurrency(row.amount)}
                  </span>
                </div>

                {row.status === "DUPLICATE" && (
                  <Badge tone="warning" className="mt-2 gap-1">
                    <Copy size={ICON.sm} /> Puede estar duplicado
                  </Badge>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form
                    action={(formData) => {
                      const categoryId = formData.get("categoryId");
                      run(() =>
                        recategorizeStaged(
                          row.id,
                          categoryId === "none" ? null : String(categoryId),
                          learnFor.has(row.id)
                        )
                      );
                    }}
                    className="flex flex-1 flex-wrap items-center gap-2"
                  >
                    <div className="min-w-40 flex-1">
                      <CategorySelect
                        categories={categories}
                        defaultValue={row.suggestedCategoryId ?? "none"}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[12px] text-(--foreground-muted)">
                      <input
                        type="checkbox"
                        checked={learnFor.has(row.id)}
                        onChange={() =>
                          setLearnFor((current) => {
                            const next = new Set(current);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })
                        }
                        className="h-3.5 w-3.5 accent-(--accent)"
                      />
                      Recordar
                    </label>
                    <Button type="submit" variant="secondary" disabled={pending}>
                      Guardar
                    </Button>
                  </form>

                  <button
                    onClick={() => run(() => setStagedStatus(row.id, "REJECTED"))}
                    className="rounded-full p-2 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                    aria-label="Descartar"
                  >
                    <X size={ICON.sm} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {toReview.length === 0 && (
          <Card>
            <p className="text-[14px] text-(--foreground-muted)">
              No queda nada por revisar en esta importación.
            </p>
          </Card>
        )}
      </div>

      {approved.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] text-(--foreground-muted)">
            Ya aprobados ({approved.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {approved.map((row) => (
              <Card key={row.id} className="flex items-center justify-between p-3 opacity-60">
                <span className="truncate text-[13px]">{row.rawDescription}</span>
                <span className="shrink-0 text-[13px]">{formatCurrency(row.amount)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
