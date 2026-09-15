"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { accountSchema } from "./schema";

export type ActionState = { error: string | null };

function revalidateAll() {
  revalidatePath("/cuentas");
  revalidatePath("/");
  revalidatePath("/salud");
}

function parseForm(formData: FormData) {
  return accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    institution: formData.get("institution") || undefined,
    last4: formData.get("last4") || undefined,
    initialBalance: formData.get("initialBalance") || 0,
    creditLimit: formData.get("creditLimit") || undefined,
    liquid: formData.get("liquid") === "on",
    includeInNetWorth: formData.get("includeInNetWorth") === "on",
    color: formData.get("color") || "#0a84ff",
  });
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.account.create({ data: parsed.data });
  revalidateAll();
  return { error: null };
}

export async function updateAccount(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.account.update({ where: { id }, data: parsed.data });
  revalidateAll();
  return { error: null };
}

export async function archiveAccount(id: string, archived: boolean) {
  await prisma.account.update({ where: { id }, data: { archived } });
  revalidateAll();
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidateAll();
}
