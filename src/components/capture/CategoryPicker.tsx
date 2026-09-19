"use client";

import { ChevronRight, CornerUpLeft } from "lucide-react";
import { CategoryGlyph } from "@/components/ui/CategoryGlyph";
import { cn, formatCurrency } from "@/lib/utils";
import type { QuickCategory, BudgetStatus } from "@/modules/transactions/quick-data";

// Elegir categoría por mosaicos en vez de por lista desplegable: se ve el color
// de cada una, se toca con el pulgar y bajar de nivel es un gesto, no abrir un
// menú dentro de otro.
export function CategoryPicker({
  categories,
  budgets,
  path,
  onNavigate,
  onPick,
}: {
  categories: QuickCategory[];
  budgets: BudgetStatus[];
  /** Camino abierto, de la raíz hacia dentro. Vacío = primer nivel. */
  path: QuickCategory[];
  onNavigate: (path: QuickCategory[]) => void;
  onPick: (category: QuickCategory) => void;
}) {
  const parentId = path.length > 0 ? path[path.length - 1].id : null;
  const visible = categories.filter((category) => category.parentId === parentId);
  const hasChildren = (id: string) =>
    categories.some((category) => category.parentId === id);

  const budgetOf = (id: string) => budgets.find((budget) => budget.categoryId === id);

  return (
    <div className="flex flex-col gap-3">
      {path.length > 0 && (
        <div className="flex items-center gap-1.5 text-[13px] text-(--foreground-muted)">
          <button
            type="button"
            onClick={() => onNavigate(path.slice(0, -1))}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-(--surface-3) text-(--foreground)"
            aria-label="Volver un nivel"
          >
            <CornerUpLeft size={14} />
          </button>
          {path.map((step, index) => (
            <span key={step.id} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={12} className="text-(--foreground-subtle)" />}
              <button
                type="button"
                onClick={() => onNavigate(path.slice(0, index + 1))}
                className={index === path.length - 1 ? "text-(--foreground)" : undefined}
              >
                {step.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Al entrar a una categoría con hijas se puede quedar en ella: no todo
          gasto de Transporte es Gasolina. */}
      {path.length > 0 && (
        <button
          type="button"
          onClick={() => onPick(path[path.length - 1])}
          className="rounded-(--radius-md) border border-(--accent)/40 bg-(--accent)/10 px-3 py-2 text-left text-[14px] text-(--accent)"
        >
          Usar “{path[path.length - 1].name}” tal cual
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        {visible.map((category, index) => {
          const budget = budgetOf(category.id);
          const remaining = budget ? budget.limit - budget.spent : null;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                hasChildren(category.id)
                  ? onNavigate([...path, category])
                  : onPick(category)
              }
              className={cn(
                "flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-(--radius-md)",
                "border border-(--border) bg-(--surface-2) px-2 py-3 text-center",
                "transition-colors active:bg-(--surface-3)"
              )}
            >
              <CategoryGlyph
                name={category.name}
                color={category.color}
                icon={category.icon}
                index={index}
              />
              <span className="text-[12px] leading-tight text-(--foreground)">
                {category.name}
              </span>
              {remaining !== null && (
                <span
                  className={cn(
                    "text-[10px]",
                    remaining < 0 ? "text-(--danger)" : "text-(--foreground-subtle)"
                  )}
                >
                  {remaining < 0 ? "excedido" : `queda ${formatCurrency(remaining)}`}
                </span>
              )}
              {hasChildren(category.id) && (
                <span className="text-[10px] text-(--foreground-subtle)">
                  {categories.filter((c) => c.parentId === category.id).length} dentro
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="py-6 text-center text-[13px] text-(--foreground-muted)">
          Aquí no hay subcategorías todavía.
        </p>
      )}
    </div>
  );
}
