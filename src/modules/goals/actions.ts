"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { goalSchema, contributionSchema } from "./schema";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/metas");
  revalidatePath("/");
}

function parseForm(formData: FormData) {
  return goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") || undefined,
    accountId: formData.get("accountId"),
    color: formData.get("color") || "#30d158",
  });
}

export async function createGoal(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { targetDate, ...rest } = parsed.data;
  await prisma.savingsGoal.create({
    data: { ...rest, userId, targetDate: targetDate ? new Date(targetDate) : null },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function updateGoal(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { targetDate, ...rest } = parsed.data;
  const { count } = await prisma.savingsGoal.updateMany({
    where: { id, userId },
    data: { ...rest, targetDate: targetDate ? new Date(targetDate) : null },
  });
  if (count === 0) return NOT_FOUND;

  revalidateAll();
  return ACTION_OK;
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await prisma.savingsGoal.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function addContribution(
  goalId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = contributionSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  if (!goal) return NOT_FOUND;

  await prisma.goalContribution.create({
    data: {
      goalId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      note: parsed.data.note,
    },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function deleteContribution(id: string) {
  const userId = await requireUserId();
  await prisma.goalContribution.deleteMany({ where: { id, goal: { userId } } });
  revalidateAll();
}
