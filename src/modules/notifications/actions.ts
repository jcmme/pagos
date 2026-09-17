"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// El contador de la campana se calcula en el layout del grupo (app), no en una
// página, y revalidatePath("/") solo invalida la página. Sin el segundo
// argumento el aviso desaparecía de la lista pero el número seguía igual.
function revalidateShell() {
  revalidatePath("/", "layout");
}

export async function dismissNotification(key: string) {
  const userId = await requireUserId();
  await prisma.insightDismissal.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key },
    update: {},
  });
  revalidateShell();
}

export async function dismissAllNotifications(keys: string[]) {
  if (keys.length === 0) return;
  const userId = await requireUserId();
  await prisma.insightDismissal.createMany({
    data: keys.map((key) => ({ userId, key })),
    skipDuplicates: true,
  });
  revalidateShell();
}
