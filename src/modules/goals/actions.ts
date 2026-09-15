"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { goalSchema, contributionSchema } from "./schema";

export type ActionState = { error: string | null };

function revalidateAll() {
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createGoal(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") || undefined,
    accountId: formData.get("accountId"),
    color: formData.get("color") || "#30d158",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { targetDate, ...rest } = parsed.data;
  await prisma.savingsGoal.create({
    data: { ...rest, targetDate: targetDate ? new Date(targetDate) : null },
  });

  revalidateAll();
  return { error: null };
}

export async function updateGoal(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") || undefined,
    accountId: formData.get("accountId"),
    color: formData.get("color") || "#30d158",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { targetDate, ...rest } = parsed.data;
  await prisma.savingsGoal.update({
    where: { id },
    data: { ...rest, targetDate: targetDate ? new Date(targetDate) : null },
  });

  revalidateAll();
  return { error: null };
}

export async function deleteGoal(id: string) {
  await prisma.savingsGoal.delete({ where: { id } });
  revalidateAll();
}

export async function addContribution(
  goalId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = contributionSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.goalContribution.create({
    data: {
      goalId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      note: parsed.data.note,
    },
  });

  revalidateAll();
  return { error: null };
}

export async function deleteContribution(id: string) {
  await prisma.goalContribution.delete({ where: { id } });
  revalidateAll();
}
