"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CategorySelect, categoryLabel, type CategoryOption } from "@/components/ui/CategorySelect";
import { RULE_MATCH_LABELS } from "@/lib/constants";
import {
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  type ActionState,
} from "@/modules/rules/actions";

type Rule = {
  id: string;
  pattern: string;
  matchType: "CONTAINS" | "STARTS_WITH" | "EXACT" | "REGEX";
  categoryId: string;
  priority: number;
  active: boolean;
  learned: boolean;
  hitCount: number;
  category: { name: string; parent: { name: string } | null };
};

const initialState: ActionState = { error: null };

function RuleForm({
  action,
  categories,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  defaults?: Rule;
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
        Cuando la descripción…
        <Select name="matchType" defaultValue={defaults?.matchType ?? "CONTAINS"}>
          {Object.entries(RULE_MATCH_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        …este texto
        <Input name="pattern" required defaultValue={defaults?.pattern} placeholder="Ej. OXXO" />
      </Field>

      <Field>
        Asignar a
        <CategorySelect
          categories={categories}
          defaultValue={defaults?.categoryId}
          includeNone={false}
          required
        />
      </Field>

      <Field>
        Prioridad
        <Input
          name="priority"
          type="number"
          min={0}
          max={100}
          defaultValue={defaults?.priority ?? 0}
        />
        <span className="text-[12px] text-(--foreground-subtle)">
          Cuando dos reglas coinciden, gana la de prioridad más alta.
        </span>
      </Field>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function RulesClient({
  rules,
  categories,
}: {
  rules: Rule[];
  categories: CategoryOption[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Reglas</h1>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={17} /> Nueva regla
        </Button>
      </div>

      <p className="mb-5 text-[13px] text-(--foreground-muted)">
        Las reglas categorizan solas los movimientos que importas. Cada vez que corriges una
        categoría en la bandeja puedes pedir que la recuerde, y aparece aquí.
      </p>

      <div className="flex flex-col gap-2">
        {rules.map((rule) => (
          <Card key={rule.id} className={`p-4 ${rule.active ? "" : "opacity-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px]">
                  <span className="text-(--foreground-muted)">
                    {RULE_MATCH_LABELS[rule.matchType]}
                  </span>{" "}
                  <span className="font-medium">{rule.pattern}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-(--foreground-subtle)">
                  → {categoryLabel(rule.category)} · usada {rule.hitCount}{" "}
                  {rule.hitCount === 1 ? "vez" : "veces"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {rule.learned && (
                  <Badge tone="accent" className="gap-1">
                    <Sparkles size={11} /> Aprendida
                  </Badge>
                )}
                <button
                  onClick={() => toggleRule(rule.id, !rule.active)}
                  className="rounded-(--radius-full) bg-(--surface-2) px-2.5 py-1 text-[12px] text-(--foreground-muted)"
                >
                  {rule.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => setEditing(rule)}
                  className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            Todavía no hay reglas. Se crean solas cuando corriges categorías al importar.
          </p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nueva regla">
        <RuleForm
          action={createRule}
          categories={categories}
          submitLabel="Crear"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar regla">
        {editing && (
          <RuleForm
            action={updateRule.bind(null, editing.id)}
            categories={categories}
            defaults={editing}
            submitLabel="Guardar cambios"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
