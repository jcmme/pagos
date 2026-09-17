"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { accountSchema } from "./schema";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/cuentas");
  revalidatePath("/");
  revalidatePath("/salud");
  revalidatePath("/pagos");
}

function parseForm(formData: FormData) {
  return accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    institution: formData.get("institution") || undefined,
    last4: formData.get("last4") || undefined,
    initialBalance: formData.get("initialBalance") || 0,
    creditLimit: formData.get("creditLimit") || undefined,
    cutoffDay: formData.get("cutoffDay") || undefined,
    paymentDueDay: formData.get("paymentDueDay") || undefined,
    liquid: formData.get("liquid") === "on",
    includeInNetWorth: formData.get("includeInNetWorth") === "on",
    color: formData.get("color") || "#0a84ff",
  });
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.account.create({ data: { ...parsed.data, userId } });
  revalidateAll();
  return ACTION_OK;
}

export async function updateAccount(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // updateMany en vez de update: el filtro por dueño va en el WHERE, así que
  // un id ajeno simplemente no encuentra nada.
  const { count } = await prisma.account.updateMany({
    where: { id, userId },
    data: parsed.data,
  });
  if (count === 0) return NOT_FOUND;

  revalidateAll();
  return ACTION_OK;
}

export async function archiveAccount(id: string, archived: boolean) {
  const userId = await requireUserId();
  await prisma.account.updateMany({ where: { id, userId }, data: { archived } });
  revalidateAll();
}

export async function deleteAccount(id: string) {
  const userId = await requireUserId();
  await prisma.account.deleteMany({ where: { id, userId } });
  revalidateAll();
}
