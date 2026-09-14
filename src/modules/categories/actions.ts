"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "./schema";

export type ActionState = { error: string | null };

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.category.create({ data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre." };
  }

  revalidatePath("/categorias");
  return { error: null };
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.category.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Ya existe una categoría con ese nombre." };
  }

  revalidatePath("/categorias");
  return { error: null };
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categorias");
}
