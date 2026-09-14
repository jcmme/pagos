"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fixedPaymentSchema } from "./schema";

export type ActionState = { error: string | null };

function normalizeCategoryId(value: FormDataEntryValue | null) {
  if (!value || value === "none") return null;
  return String(value);
}

function parseForm(formData: FormData) {
  return fixedPaymentSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    dueDay: formData.get("dueDay"),
    dueMonth: formData.get("dueMonth") || undefined,
    categoryId: normalizeCategoryId(formData.get("categoryId")),
  });
}

export async function createFixedPayment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.fixedPayment.create({ data: parsed.data });

  revalidatePath("/pagos");
  revalidatePath("/");
  return { error: null };
}

export async function updateFixedPayment(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.fixedPayment.update({ where: { id }, data: parsed.data });

  revalidatePath("/pagos");
  revalidatePath("/");
  return { error: null };
}

export async function deleteFixedPayment(id: string) {
  await prisma.fixedPayment.delete({ where: { id } });
  revalidatePath("/pagos");
  revalidatePath("/");
}

export async function toggleFixedPaymentActive(id: string, active: boolean) {
  await prisma.fixedPayment.update({ where: { id }, data: { active } });
  revalidatePath("/pagos");
  revalidatePath("/");
}

export async function markFixedPaymentPaid(id: string) {
  await prisma.fixedPayment.update({
    where: { id },
    data: { lastPaidAt: new Date(), lastNotifiedAt: null },
  });
  revalidatePath("/pagos");
  revalidatePath("/");
}
