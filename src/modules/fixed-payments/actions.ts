"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { fixedPaymentSchema } from "./schema";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/pagos");
  revalidatePath("/");
  revalidatePath("/cuentas");
}

function normalizeId(value: FormDataEntryValue | null) {
  if (!value || value === "none") return null;
  return String(value);
}

function parseForm(formData: FormData) {
  return fixedPaymentSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    kind: formData.get("kind") ?? "EXPENSE",
    frequency: formData.get("frequency"),
    dueDay: formData.get("dueDay"),
    dueMonth: formData.get("dueMonth") || undefined,
    categoryId: normalizeId(formData.get("categoryId")),
    accountId: normalizeId(formData.get("accountId")),
  });
}

async function ownedAccountId(userId: string, accountId: string | null | undefined) {
  if (!accountId) return null;
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  return account?.id ?? null;
}

export async function createFixedPayment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.fixedPayment.create({
    data: {
      ...parsed.data,
      userId,
      accountId: await ownedAccountId(userId, parsed.data.accountId),
    },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function updateFixedPayment(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await prisma.fixedPayment.updateMany({
    where: { id, userId },
    data: {
      ...parsed.data,
      accountId: await ownedAccountId(userId, parsed.data.accountId),
    },
  });
  if (count === 0) return NOT_FOUND;

  revalidateAll();
  return ACTION_OK;
}

export async function deleteFixedPayment(id: string) {
  const userId = await requireUserId();
  await prisma.fixedPayment.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function toggleFixedPaymentActive(id: string, active: boolean) {
  const userId = await requireUserId();
  await prisma.fixedPayment.updateMany({ where: { id, userId }, data: { active } });
  revalidateAll();
}

export async function markFixedPaymentPaid(id: string) {
  const userId = await requireUserId();
  await prisma.fixedPayment.updateMany({
    where: { id, userId },
    data: { lastPaidAt: new Date() },
  });
  revalidateAll();
}
