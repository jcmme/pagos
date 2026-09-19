"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, CornerDownRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CATEGORY_COLORS } from "@/lib/constants";
import { CATEGORY_ICONS, ICON_GROUPS, guessIcon } from "@/lib/category-icons";
import { CategoryGlyph } from "@/components/ui/CategoryGlyph";
import { cn } from "@/lib/utils";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type ActionState,
} from "@/modules/categories/actions";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  parentId: string | null;
  essential: boolean;
  parent: { id: string; name: string } | null;
  _count: { transactions: number; children: number };
};

const initialState: ActionState = { error: null };

function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={color} />
      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setColor(option)}
            className="h-8 w-8 rounded-full transition-transform"
            style={{
              background: option,
              boxShadow: color === option ? `0 0 0 2px ${option}` : undefined,
              transform: color === option ? "scale(1.1)" : undefined,
            }}
            aria-label={option}
          />
        ))}
      </div>
    </div>
  );
}

function IconPicker({
  name,
  defaultValue,
  categoryName,
  color,
}: {
  name: string;
  defaultValue: string | null;
  categoryName: string;
  color: string;
}) {
  // Sin icono guardado se propone el que sugiere el nombre, pero nada se
  // escribe hasta que se toca: la propuesta es una ayuda, no una decisión.
  const [icon, setIcon] = useState<string | null>(
    defaultValue ?? guessIcon(categoryName)
  );

  return (
    <div>
      <input type="hidden" name={name} value={icon ?? "none"} />

      <div className="mb-2 flex items-center gap-2">
        <CategoryGlyph
          name={categoryName || "?"}
          color={color}
          icon={icon}
          animate={false}
        />
        <button
          type="button"
          onClick={() => setIcon(null)}
          className="text-[12px] text-(--foreground-muted) underline-offset-2 hover:underline"
        >
          Usar la inicial
        </button>
      </div>

      <div className="max-h-44 overflow-y-auto rounded-(--radius-md) bg-(--surface-2) p-2">
        {ICON_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="mb-1 text-[11px] text-(--foreground-subtle)">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.icons.map((option) => {
                const Icon = CATEGORY_ICONS[option];
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIcon(option)}
                    aria-label={option}
                    aria-pressed={icon === option}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-(--radius-sm) transition-colors",
                      icon === option
                        ? "bg-(--accent) text-white"
                        : "bg-(--surface-3) text-(--foreground-muted) hover:text-(--foreground)"
                    )}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryForm({
  action,
  roots,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  roots: Category[];
  defaults?: Category;
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
        <Input name="name" required defaultValue={defaults?.name} placeholder="Ej. Gasolina" />
      </Field>

      <Field>
        Depende de
        <Select name="parentId" defaultValue={defaults?.parentId ?? "none"}>
          <option value="none">Es una categoría principal</option>
          {roots
            .filter((root) => root.id !== defaults?.id)
            .map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
        </Select>
      </Field>

      <Field>
        Color
        <ColorPicker name="color" defaultValue={defaults?.color ?? CATEGORY_COLORS[0]} />
      </Field>

      <Field>
        Icono
        <IconPicker
          name="icon"
          defaultValue={defaults?.icon ?? null}
          categoryName={defaults?.name ?? ""}
          color={defaults?.color ?? CATEGORY_COLORS[0]}
        />
      </Field>

      <label className="flex items-start gap-2 text-[13px] text-(--foreground-muted)">
        <input
          type="checkbox"
          name="essential"
          defaultChecked={defaults?.essential}
          className="mt-0.5 h-4 w-4 accent-(--accent)"
        />
        <span>
          Gasto esencial
          <span className="block text-[12px] text-(--foreground-subtle)">
            Los esenciales son la base para calcular cuántos meses aguanta tu fondo de
            emergencia.
          </span>
        </span>
      </label>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  const roots = categories.filter((category) => !category.parentId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Categorías</h1>
        <Button onClick={() => setCreating({ parentId: null })} className="gap-1.5">
          <Plus size={17} /> Nueva categoría
        </Button>
      </div>

      <div className="stagger flex flex-col gap-3">
        {roots.map((root, index) => {
          const children = categories.filter((category) => category.parentId === root.id);

          return (
            <Card key={root.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CategoryGlyph
                    name={root.name}
                    color={root.color}
                    icon={root.icon}
                    size="sm"
                    index={index}
                  />
                  <span className="truncate text-[15px] font-medium">{root.name}</span>
                  {root.essential && (
                    <Badge tone="accent" className="gap-1">
                      <ShieldCheck size={11} /> Esencial
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setCreating({ parentId: root.id })}
                    className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--accent)"
                    aria-label="Agregar subcategoría"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    onClick={() => setEditing(root)}
                    className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
                    aria-label="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteCategory(root.id)}
                    className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {children.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 border-t border-(--border) pt-3">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-[14px]">
                        <CornerDownRight size={14} className="shrink-0 text-(--foreground-subtle)" />
                        <span className="truncate">{child.name}</span>
                        {child._count.transactions > 0 && (
                          <span className="text-[12px] text-(--foreground-subtle)">
                            {child._count.transactions}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => setEditing(child)}
                          className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
                          aria-label="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteCategory(child.id)}
                          className="rounded-full p-1.5 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--danger)"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {roots.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            Aún no tienes categorías. Crea la primera.
          </p>
        )}
      </div>

      <Modal
        open={!!creating}
        onClose={() => setCreating(null)}
        title={creating?.parentId ? "Nueva subcategoría" : "Nueva categoría"}
      >
        {creating && (
          <CategoryForm
            action={createCategory}
            roots={roots}
            defaults={
              creating.parentId
                ? ({ parentId: creating.parentId } as Category)
                : undefined
            }
            submitLabel="Crear"
            onSuccess={() => setCreating(null)}
          />
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar categoría">
        {editing && (
          <CategoryForm
            action={updateCategory.bind(null, editing.id)}
            roots={roots}
            defaults={editing}
            submitLabel="Guardar"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
