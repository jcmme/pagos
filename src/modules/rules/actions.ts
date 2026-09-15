"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ruleSchema } from "./schema";

export type ActionState = { error: string | null };

function revalidateAll() {
  revalidatePath("/reglas");
  revalidatePath("/importar");
}

function parseForm(formData: FormData) {
  return ruleSchema.safeParse({
    pattern: formData.get("pattern"),
    matchType: formData.get("matchType") ?? "CONTAINS",
    categoryId: formData.get("categoryId"),
    priority: formData.get("priority") ?? 0,
  });
}

export async function createRule(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.matchType === "REGEX") {
    try {
      new RegExp(parsed.data.pattern);
    } catch {
      return { error: "La expresión regular no es válida." };
    }
  }

  try {
    await prisma.categoryRule.create({ data: parsed.data });
  } catch {
    return { error: "Ya existe una regla con ese texto y tipo de coincidencia." };
  }

  revalidateAll();
  return { error: null };
}

export async function updateRule(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await prisma.categoryRule.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Ya existe una regla con ese texto y tipo de coincidencia." };
  }

  revalidateAll();
  return { error: null };
}

export async function toggleRule(id: string, active: boolean) {
  await prisma.categoryRule.update({ where: { id }, data: { active } });
  revalidateAll();
}

export async function deleteRule(id: string) {
  await prisma.categoryRule.delete({ where: { id } });
  revalidateAll();
}
