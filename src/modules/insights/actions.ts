"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function dismissInsight(key: string) {
  await prisma.insightDismissal.upsert({
    where: { key },
    create: { key },
    update: {},
  });
  revalidatePath("/");
}
