"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { expenseSchema, importRowSchema } from "./schema";

export type ActionState = { error: string | null };

function normalizeCategoryId(value: FormDataEntryValue | null) {
  if (!value || value === "none") return null;
  return String(value);
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    categoryId: normalizeCategoryId(formData.get("categoryId")),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.expense.create({
    data: {
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      categoryId: parsed.data.categoryId,
      note: parsed.data.note,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  return { error: null };
}

export async function updateExpense(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    categoryId: normalizeCategoryId(formData.get("categoryId")),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      categoryId: parsed.data.categoryId,
      note: parsed.data.note,
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  return { error: null };
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/gastos");
  revalidatePath("/");
}

export type ImportRow = {
  amount: number;
  date: string;
  categoryId: string | null;
  note?: string;
};

export async function importExpenses(rows: ImportRow[]) {
  const valid = rows.filter((r) => importRowSchema.safeParse(r).success);
  if (valid.length === 0) return { imported: 0 };

  await prisma.expense.createMany({
    data: valid.map((r) => ({
      amount: r.amount,
      date: new Date(r.date),
      categoryId: r.categoryId,
      note: r.note,
      source: "IMPORTED" as const,
    })),
  });

  revalidatePath("/gastos");
  revalidatePath("/");
  return { imported: valid.length };
}
