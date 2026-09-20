"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, type ActionState } from "@/lib/action-state";
import { allocationSchema, budgetSchema } from "./schema";

export type { ActionState };

function refresh() {
  revalidatePath("/presupuestos");
  revalidatePath("/");
}

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
    // Definir un monto fijo apaga el porcentaje: uno de los dos, nunca ambos.
    // Es la misma regla que impone el CHECK de la migración.
    update: { amount: parsed.data.amount, percent: null },
  });

  refresh();
  return ACTION_OK;
}

export async function deleteBudget(id: string) {
  const userId = await requireUserId();
  await prisma.budget.deleteMany({ where: { id, userId } });
  refresh();
}

/**
 * Guarda el reparto del mes completo.
 *
 * Llega como `percent:<categoryId>` por cada categoría raíz, incluidas las que
 * quedaron en blanco: hace falta saberlas para borrar el porcentaje que
 * tuvieran antes.
 */
export async function saveAllocation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();

  const entries: { categoryId: string; percent: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("percent:")) continue;
    const categoryId = key.slice("percent:".length);
    // El teclado del teléfono ofrece coma en algunas distribuciones.
    const raw = String(value).trim().replace(",", ".");
    if (raw === "") {
      entries.push({ categoryId, percent: 0 });
      continue;
    }
    const percent = Number(raw);
    if (!Number.isFinite(percent)) {
      return { error: "Hay un porcentaje que no es un número" };
    }
    entries.push({ categoryId, percent: Math.round(percent * 100) / 100 });
  }

  const parsed = allocationSchema.safeParse({
    month: formData.get("month"),
    year: formData.get("year"),
    entries,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { month, year } = parsed.data;
  const assigned = parsed.data.entries.filter((entry) => entry.percent > 0);
  const cleared = parsed.data.entries
    .filter((entry) => entry.percent === 0)
    .map((entry) => entry.categoryId);

  // Todo en una transacción: un reparto a medias dejaría el mes sumando algo
  // que nadie pidió.
  await prisma.$transaction([
    // Solo se borran las filas por porcentaje. Si una categoría tenía un monto
    // fijo y se dejó su porcentaje en blanco, ese monto se respeta.
    prisma.budget.deleteMany({
      where: {
        userId,
        month,
        year,
        categoryId: { in: cleared },
        percent: { not: null },
      },
    }),
    ...assigned.map((entry) =>
      prisma.budget.upsert({
        where: {
          userId_categoryId_month_year: {
            userId,
            categoryId: entry.categoryId,
            month,
            year,
          },
        },
        create: {
          userId,
          categoryId: entry.categoryId,
          month,
          year,
          percent: entry.percent,
        },
        update: { percent: entry.percent, amount: null },
      })
    ),
  ]);

  refresh();
  return ACTION_OK;
}
