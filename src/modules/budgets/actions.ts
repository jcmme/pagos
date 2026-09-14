"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "./schema";

export type ActionState = { error: string | null };

export async function upsertBudget(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.budget.upsert({
    where: {
      categoryId_month_year: {
        categoryId: parsed.data.categoryId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
    },
    create: parsed.data,
    update: { amount: parsed.data.amount },
  });

  revalidatePath("/presupuestos");
  revalidatePath("/");
  return { error: null };
}

export async function deleteBudget(id: string) {
  await prisma.budget.delete({ where: { id } });
  revalidatePath("/presupuestos");
  revalidatePath("/");
}
