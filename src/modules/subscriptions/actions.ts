"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncSubscriptions } from "./detect";

export type ActionState = { error: string | null };

function revalidateAll() {
  revalidatePath("/suscripciones");
  revalidatePath("/pagos");
  revalidatePath("/");
}

export async function refreshSubscriptions() {
  await syncSubscriptions();
  revalidateAll();
}

export async function dismissSubscription(id: string) {
  await prisma.subscription.update({ where: { id }, data: { status: "DISMISSED" } });
  revalidateAll();
}

// Convierte la suscripción detectada en un pago fijo, para que entre al
// cálculo de "disponible para gastar" y a los recordatorios.
export async function confirmSubscription(id: string): Promise<ActionState> {
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) return { error: "La suscripción ya no existe." };
  if (subscription.fixedPaymentId) return { error: "Ya la habías convertido en pago fijo." };

  const frequency =
    subscription.cadenceDays <= 10
      ? "WEEKLY"
      : subscription.cadenceDays >= 300
        ? "YEARLY"
        : "MONTHLY";

  const created = await prisma.fixedPayment.create({
    data: {
      name: subscription.label,
      amount: subscription.lastAmount,
      kind: "EXPENSE",
      frequency,
      dueDay:
        frequency === "WEEKLY"
          ? ((subscription.lastChargeAt.getUTCDay() + 6) % 7) + 1
          : subscription.lastChargeAt.getUTCDate(),
      dueMonth: frequency === "YEARLY" ? subscription.lastChargeAt.getUTCMonth() + 1 : null,
    },
  });

  await prisma.subscription.update({
    where: { id },
    data: { status: "CONFIRMED", fixedPaymentId: created.id },
  });

  revalidateAll();
  return { error: null };
}
