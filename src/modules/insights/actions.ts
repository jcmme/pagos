"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function dismissInsight(key: string) {
  const userId = await requireUserId();
  await prisma.insightDismissal.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key },
    update: {},
  });
  revalidatePath("/");
}
