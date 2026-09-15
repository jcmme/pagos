"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "./schema";

export type ActionState = { error: string | null };

function revalidateAll() {
  revalidatePath("/categorias");
  revalidatePath("/movimientos");
  revalidatePath("/");
}

function parseForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    parentId: formData.get("parentId"),
    essential: formData.get("essential") === "on",
  });
}

// Solo se permiten dos niveles: una subcategoría no puede tener hijas. Postgres
// no puede expresar esa profundidad con una restricción simple, así que se
// valida aquí.
async function assertParentIsRoot(parentId: string | null): Promise<string | null> {
  if (!parentId) return null;

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { parentId: true },
  });

  if (!parent) return "La categoría padre no existe.";
  if (parent.parentId) return "Solo se permiten dos niveles de categorías.";
  return null;
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parentError = await assertParentIsRoot(parsed.data.parentId);
  if (parentError) return { error: parentError };

  try {
    await prisma.category.create({ data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre en ese nivel." };
  }

  revalidateAll();
  return { error: null };
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.parentId === id) {
    return { error: "Una categoría no puede ser su propia padre." };
  }

  const parentError = await assertParentIsRoot(parsed.data.parentId);
  if (parentError) return { error: parentError };

  // Si la categoría ya tiene hijas no puede convertirse en subcategoría.
  if (parsed.data.parentId) {
    const children = await prisma.category.count({ where: { parentId: id } });
    if (children > 0) {
      return { error: "Esta categoría tiene subcategorías, no puede depender de otra." };
    }
  }

  try {
    await prisma.category.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre en ese nivel." };
  }

  revalidateAll();
  return { error: null };
}

export async function deleteCategory(id: string) {
  // onDelete: Restrict impide borrar una categoría con subcategorías; se
  // borran primero las hijas para que la acción no falle en silencio.
  await prisma.$transaction([
    prisma.category.deleteMany({ where: { parentId: id } }),
    prisma.category.delete({ where: { id } }),
  ]);
  revalidateAll();
}
