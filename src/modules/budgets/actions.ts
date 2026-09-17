"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, type ActionState } from "@/lib/action-state";
import { budgetSchema } from "./schema";

export type { ActionState };

export async function upsertBudget(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId: parsed.data.categoryId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
    },
    create: { ...parsed.data, userId },
    update: { amount: parsed.data.amount },
  });

  revalidatePath("/presupuestos");
  revalidatePath("/");
  return ACTION_OK;
}

export async function deleteBudget(id: string) {
  const userId = await requireUserId();
  await prisma.budget.deleteMany({ where: { id, userId } });
  revalidatePath("/presupuestos");
  revalidatePath("/");
}
