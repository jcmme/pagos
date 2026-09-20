"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, type ActionState } from "@/lib/action-state";
import { baseIncomeSchema, incomeModeSchema, monthIncomeSchema } from "./schema";

export type { ActionState };

// Todo lo que toca el ingreso repinta las dos pantallas donde se nota: el
// reparto y el resumen, que muestra cuánto queda por gastar.
function refresh() {
  revalidatePath("/presupuestos");
  revalidatePath("/");
}

/** El sueldo base del modo fijo: vale para todos los meses sin fila propia. */
export async function saveBaseIncome(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = baseIncomeSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({
    where: { id: userId },
    data: { monthlyIncome: parsed.data.amount },
  });

  refresh();
  return ACTION_OK;
}

/** Lo que hay para gastar en un mes concreto. Le gana al sueldo base. */
export async function saveMonthIncome(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = monthIncomeSchema.safeParse({
    amount: formData.get("amount"),
    month: formData.get("month"),
    year: formData.get("year"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { amount, month, year } = parsed.data;
  await prisma.monthlyIncome.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: { userId, month, year, amount },
    update: { amount },
  });

  refresh();
  return ACTION_OK;
}

/** Borra la cifra de un mes: en modo fijo vuelve a valer el sueldo base, y en
 *  variable el mes queda sin capturar y el reparto se pone en pausa. */
export async function deleteMonthIncome(month: number, year: number) {
  const userId = await requireUserId();
  await prisma.monthlyIncome.deleteMany({ where: { userId, month, year } });
  refresh();
}

/** El interruptor. Son dos posiciones excluyentes, así que no recibe un
 *  booleano por cada una: recibe la que queda encendida. */
export async function setIncomeMode(mode: string) {
  const userId = await requireUserId();
  const parsed = incomeModeSchema.safeParse(mode);
  if (!parsed.success) return;

  await prisma.user.update({
    where: { id: userId },
    data: { incomeMode: parsed.data },
  });

  refresh();
}
