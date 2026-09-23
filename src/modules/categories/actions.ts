"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, type ActionState } from "@/lib/action-state";
import { categorySchema, MAX_CATEGORY_DEPTH } from "./schema";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/categorias");
  revalidatePath("/movimientos");
  revalidatePath("/");
}

function parseForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    parentId: formData.get("parentId"),
    essential: formData.get("essential") === "on",
  });
}

// Qué tan hondo está un nodo: 1 para una raíz. Se sube por los padres en vez
// de usar una consulta recursiva porque como mucho hay tres niveles.
async function depthOf(categoryId: string): Promise<number> {
  let depth = 1;
  let current = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });

  while (current?.parentId) {
    depth += 1;
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }

  return depth;
}

// Cuántos niveles cuelgan de un nodo, contándolo a él: 1 si no tiene hijas.
// Mover una categoría arrastra su subárbol, así que hay que medirlo antes.
async function heightOf(categoryId: string): Promise<number> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  if (children.length === 0) return 1;

  const heights = await Promise.all(children.map((child) => heightOf(child.id)));
  return 1 + Math.max(...heights);
}

const TOO_DEEP = `Solo se permiten ${MAX_CATEGORY_DEPTH} niveles de categorías.`;

async function assertFits(
  parentId: string | null,
  subtreeHeight: number
): Promise<string | null> {
  if (!parentId) return null;

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) return "La categoría padre no existe.";

  const parentDepth = await depthOf(parentId);
  if (parentDepth + subtreeHeight > MAX_CATEGORY_DEPTH) return TOO_DEEP;
  return null;
}

// Las categorías y las reglas son un catálogo COMPARTIDO por toda la
// instancia: no cuelgan de una persona, así que no hay un `userId` en el WHERE
// que sirva de filtro. Eso las dejaba sin ninguna comprobación: el único
// obstáculo era el redirect del proxy, y una server action se puede invocar
// directamente.
//
// Y el daño no es menor: borrar una categoría arrastra en cascada los
// presupuestos de TODAS las personas de esa categoría y deja sin categoría
// sus movimientos. `requireUserId` lanza si no hay sesión, que es el mínimo
// que faltaba.
export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUserId();

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const error = await assertFits(parsed.data.parentId, 1);
  if (error) return { error };

  try {
    await prisma.category.create({ data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre en ese nivel." };
  }

  revalidateAll();
  return ACTION_OK;
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUserId();

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { parentId } = parsed.data;

  if (parentId === id) {
    return { error: "Una categoría no puede ser su propia padre." };
  }

  // Colgar una categoría de una de sus propias descendientes dejaría un ciclo
  // suelto, fuera del árbol y sin forma de volver a editarlo.
  if (parentId) {
    const descendants = await collectDescendants(id);
    if (descendants.has(parentId)) {
      return { error: "No puedes mover una categoría dentro de una de sus subcategorías." };
    }
  }

  const error = await assertFits(parentId, await heightOf(id));
  if (error) return { error };

  try {
    await prisma.category.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre en ese nivel." };
  }

  revalidateAll();
  return ACTION_OK;
}

async function collectDescendants(categoryId: string): Promise<Set<string>> {
  const found = new Set<string>();
  let frontier = [categoryId];

  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id);
    for (const id of frontier) found.add(id);
  }

  return found;
}

/**
 * Marca qué categoría se queda con lo que no se reparte al asignar
 * porcentajes. Solo puede haber una, así que marcar una desmarca las demás en
 * la misma transacción: dos marcadas harían que el sobrante se contara doble.
 */
export async function setSavingsCategory(id: string) {
  await requireUserId();

  const category = await prisma.category.findUnique({
    where: { id },
    select: { parentId: true },
  });
  // El reparto por porcentaje es de las raíces: una subcategoría no puede
  // quedarse con el sobrante del mes.
  if (!category || category.parentId) return;

  await prisma.$transaction([
    prisma.category.updateMany({
      where: { savings: true, id: { not: id } },
      data: { savings: false },
    }),
    prisma.category.update({ where: { id }, data: { savings: true } }),
  ]);

  revalidateAll();
  revalidatePath("/presupuestos");
}

export async function deleteCategory(id: string) {
  await requireUserId();

  // onDelete: Restrict impide borrar una categoría que tenga descendientes, y
  // con tres niveles ya no basta con borrar las hijas directas.
  const descendants = await collectDescendants(id);

  await prisma.$transaction([
    prisma.category.deleteMany({ where: { id: { in: [...descendants] } } }),
    prisma.category.delete({ where: { id } }),
  ]);
  revalidateAll();
}
