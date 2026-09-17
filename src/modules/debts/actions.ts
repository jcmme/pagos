"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { debtSchema, debtPaymentSchema } from "./schema";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/deudas");
  revalidatePath("/");
  revalidatePath("/salud");
}

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
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.debt.create({
    data: { ...parsed.data, userId, startDate: new Date(parsed.data.startDate) },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function updateDebt(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { count } = await prisma.debt.updateMany({
    where: { id, userId },
    data: { ...parsed.data, startDate: new Date(parsed.data.startDate) },
  });
  if (count === 0) return NOT_FOUND;

  revalidateAll();
  return ACTION_OK;
}

export async function deleteDebt(id: string) {
  const userId = await requireUserId();
  await prisma.debt.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function addDebtPayment(
  debtId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = debtPaymentSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // El abono no lleva dueño propio: hereda el de su deuda, así que basta con
  // comprobar que la deuda sea de quien abona.
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, userId },
    select: { id: true },
  });
  if (!debt) return NOT_FOUND;

  await prisma.debtPayment.create({
    data: {
      debtId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      note: parsed.data.note,
    },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function deleteDebtPayment(id: string) {
  const userId = await requireUserId();
  await prisma.debtPayment.deleteMany({ where: { id, debt: { userId } } });
  revalidateAll();
}
