import { Select } from "@/components/ui/Input";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

// Presenta las categorías agrupadas por su padre. Las subcategorías son la
// opción normal a elegir; las raíz siguen siendo seleccionables para quien no
// quiera bajar a ese nivel de detalle.
export function CategorySelect({
  categories,
  defaultValue,
  name = "categoryId",
  includeNone = true,
  required = false,
}: {
  categories: CategoryOption[];
  defaultValue?: string;
  name?: string;
  includeNone?: boolean;
  required?: boolean;
}) {
  const roots = categories.filter((category) => !category.parentId);

  return (
    <Select name={name} defaultValue={defaultValue ?? (includeNone ? "none" : undefined)} required={required}>
      {includeNone && <option value="none">Sin categoría</option>}
      {roots.map((root) => {
        const children = categories.filter((category) => category.parentId === root.id);
        if (children.length === 0) {
          return (
            <option key={root.id} value={root.id}>
              {root.name}
            </option>
          );
        }
        return (
          <optgroup key={root.id} label={root.name}>
            <option value={root.id}>{root.name} (general)</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}

export function categoryLabel(category: {
  name: string;
  parent: { name: string } | null;
} | null): string {
  if (!category) return "Sin categoría";
  return category.parent ? `${category.parent.name} › ${category.name}` : category.name;
}
