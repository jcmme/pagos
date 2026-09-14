"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { debtSchema, debtPaymentSchema } from "./schema";

export type ActionState = { error: string | null };

function parseForm(formData: FormData) {
  return debtSchema.safeParse({
    name: formData.get("name"),
    counterparty: formData.get("counterparty") || undefined,
    type: formData.get("type"),
    totalAmount: formData.get("totalAmount"),
    interestRate: formData.get("interestRate") || undefined,
    startDate: formData.get("startDate"),
    note: formData.get("note") || undefined,
  });
}

export async function createDebt(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.debt.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
    },
  });

  revalidatePath("/deudas");
  revalidatePath("/");
  return { error: null };
}

export async function updateDebt(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.debt.update({
    where: { id },
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
    },
  });

  revalidatePath("/deudas");
  revalidatePath("/");
  return { error: null };
}

export async function deleteDebt(id: string) {
  await prisma.debt.delete({ where: { id } });
  revalidatePath("/deudas");
  revalidatePath("/");
}

export async function addDebtPayment(
  debtId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = debtPaymentSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.debtPayment.create({
    data: {
      debtId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      note: parsed.data.note,
    },
  });

  revalidatePath("/deudas");
  revalidatePath("/");
  return { error: null };
}

export async function deleteDebtPayment(id: string) {
  await prisma.debtPayment.delete({ where: { id } });
  revalidatePath("/deudas");
  revalidatePath("/");
}
