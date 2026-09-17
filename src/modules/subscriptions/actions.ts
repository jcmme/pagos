"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { syncSubscriptions } from "./detect";

export type { ActionState };

function revalidateAll() {
  revalidatePath("/suscripciones");
  revalidatePath("/pagos");
  revalidatePath("/");
}

export async function refreshSubscriptions() {
  const userId = await requireUserId();
  await syncSubscriptions(userId);
  revalidateAll();
}

export async function dismissSubscription(id: string) {
  const userId = await requireUserId();
  await prisma.subscription.updateMany({
    where: { id, userId },
    data: { status: "DISMISSED" },
  });
  revalidateAll();
}

// Convierte la suscripción detectada en un pago fijo, para que entre al
// cálculo de "disponible para gastar" y a los recordatorios.
export async function confirmSubscription(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const subscription = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!subscription) return NOT_FOUND;
  if (subscription.fixedPaymentId) return { error: "Ya la habías convertido en pago fijo." };

  const frequency =
    subscription.cadenceDays <= 10
      ? "WEEKLY"
      : subscription.cadenceDays >= 300
        ? "YEARLY"
        : "MONTHLY";

  const created = await prisma.fixedPayment.create({
    data: {
      userId,
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
  return ACTION_OK;
}
