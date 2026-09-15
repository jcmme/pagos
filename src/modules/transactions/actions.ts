"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeMerchant } from "@/lib/merchant";
import { slugify } from "@/lib/slug";
import { transactionSchema } from "./schema";

export type ActionState = { error: string | null };

const TOUCHED_PATHS = ["/movimientos", "/", "/salud", "/cuentas", "/presupuestos"];

function revalidateAll() {
  for (const path of TOUCHED_PATHS) revalidatePath(path);
}

function parseForm(formData: FormData) {
  return transactionSchema.safeParse({
    kind: formData.get("kind") ?? "EXPENSE",
    amount: formData.get("amount"),
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId"),
    transferAccountId: formData.get("transferAccountId"),
    note: formData.get("note") || undefined,
    description: formData.get("description") || undefined,
    tags: formData
      .getAll("tags")
      .flatMap((value) => String(value).split(","))
      .map((tag) => tag.trim())
      .filter(Boolean),
    excludeFromStats: formData.get("excludeFromStats") === "on",
  });
}

// Crea los tags que falten y devuelve el connect para la relación m2m.
async function connectTags(names: string[]) {
  if (names.length === 0) return undefined;

  const tags = await Promise.all(
    names.map((name) =>
      prisma.tag.upsert({
        where: { slug: slugify(name) },
        create: { name, slug: slugify(name) },
        update: {},
      })
    )
  );

  return { set: tags.map((tag) => ({ id: tag.id })) };
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  const tags = await connectTags(data.tags);

  await prisma.transaction.create({
    data: {
      kind: data.kind,
      amount: data.amount,
      date: new Date(data.date),
      note: data.note,
      description: data.description,
      merchantKey: normalizeMerchant(data.description ?? data.note),
      categoryId: data.categoryId,
      accountId: data.accountId,
      transferAccountId: data.kind === "TRANSFER" ? data.transferAccountId : null,
      excludeFromStats: data.excludeFromStats,
      ...(tags ? { tags: { connect: tags.set } } : {}),
    },
  });

  revalidateAll();
  return { error: null };
}

export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  const tags = await connectTags(data.tags);

  await prisma.transaction.update({
    where: { id },
    data: {
      kind: data.kind,
      amount: data.amount,
      date: new Date(data.date),
      note: data.note,
      description: data.description,
      merchantKey: normalizeMerchant(data.description ?? data.note),
      categoryId: data.categoryId,
      accountId: data.accountId,
      transferAccountId: data.kind === "TRANSFER" ? data.transferAccountId : null,
      excludeFromStats: data.excludeFromStats,
      tags: tags ?? { set: [] },
    },
  });

  revalidateAll();
  return { error: null };
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidateAll();
}
