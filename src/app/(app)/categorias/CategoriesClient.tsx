"use client";

import { useActionState, useState } from "react";
import type { Category } from "@prisma/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  ActionState,
} from "@/modules/categories/actions";

const initialState: ActionState = { error: null };

function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={color} />
      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="h-8 w-8 rounded-full ring-offset-2 ring-offset-(--surface) transition-transform"
            style={{
              background: c,
              boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
              transform: color === c ? "scale(1.1)" : undefined,
            }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryForm({
  action,
  defaultName = "",
  defaultColor = CATEGORY_COLORS[0],
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaultName?: string;
  defaultColor?: string;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await action(prev, fd);
    if (!res.error) onSuccess();
    return res;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Nombre
        <Input name="name" required defaultValue={defaultName} placeholder="Ej. Comida" />
      </Field>
      <Field>
        Color
        <ColorPicker name="color" defaultValue={defaultColor} />
      </Field>
      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={17} /> Nueva categoría
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <span className="truncate text-[14px]">{cat.name}</span>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setEditing(cat)}
                className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
                aria-label="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="col-span-full text-[14px] text-(--foreground-muted)">
            Aún no tienes categorías. Crea la primera.
          </p>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nueva categoría">
        <CategoryForm
          action={createCategory}
          submitLabel="Crear"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar categoría">
        {editing && (
          <CategoryForm
            action={updateCategory.bind(null, editing.id)}
            defaultName={editing.name}
            defaultColor={editing.color}
            submitLabel="Guardar"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
