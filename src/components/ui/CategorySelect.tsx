import { Select } from "@/components/ui/Input";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  parent: { id: string; name: string; parent?: { name: string } | null } | null;
};

// Sangría por nivel. Un `<optgroup>` solo agrupa un nivel, y con tres niveles
// (Loreto › Escuela › Inscripción) hace falta poder ver la jerarquía completa
// dentro de la lista.
const INDENT = "    ";

function descendants(categories: CategoryOption[], parentId: string | null) {
  return categories.filter((category) => category.parentId === parentId);
}

// Presenta las categorías como árbol aplanado con sangría. Cualquier nivel es
// seleccionable: quien no quiera bajar al detalle se queda en la raíz.
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
  function renderLevel(parentId: string | null, depth: number): React.ReactNode[] {
    return descendants(categories, parentId).flatMap((category) => [
      <option key={category.id} value={category.id}>
        {INDENT.repeat(depth)}
        {category.name}
      </option>,
      ...renderLevel(category.id, depth + 1),
    ]);
  }

  return (
    <Select
      name={name}
      defaultValue={defaultValue ?? (includeNone ? "none" : undefined)}
      required={required}
    >
      {includeNone && <option value="none">Sin categoría</option>}
      {renderLevel(null, 0)}
    </Select>
  );
}

// La ruta completa, para las listas: "Loreto › Escuela › Inscripción".
export function categoryLabel(
  category: {
    name: string;
    parent?: { name: string; parent?: { name: string } | null } | null;
  } | null
): string {
  if (!category) return "Sin categoría";

  const path = [category.name];
  let current = category.parent;
  while (current) {
    path.unshift(current.name);
    current = current.parent ?? null;
  }
  return path.join(" › ");
}
