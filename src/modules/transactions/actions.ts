"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { normalizeMerchant } from "@/lib/merchant";
import { slugify } from "@/lib/slug";
import { transactionSchema, quickTransactionSchema } from "./schema";

export type { ActionState };

// Las pantallas que de verdad cambian al tocar un movimiento, y ninguna más.
//
// Salud, Cuentas y Presupuestos salían de aquí, y revalidarlas obligaba a
// rehacer sus consultas —el Resumen son unas cuarenta, Salud catorce— en cada
// captura, aunque la persona estuviera en Movimientos y no fuera a mirarlas.
// Las tres son `force-dynamic`, así que se recalculan solas al entrar: no
// pueden quedarse con datos viejos por no estar en esta lista.
const TOUCHED_PATHS = ["/movimientos", "/"];

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

// Las cuentas y las categorías llegan como id desde el formulario. La
// categoría es catálogo común, pero la cuenta es de alguien: si no es tuya, se
// guarda sin cuenta en vez de apuntar a la de otra persona.
async function ownedAccountId(userId: string, accountId: string | null) {
  if (!accountId) return null;
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  return account?.id ?? null;
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  const tags = await connectTags(data.tags);

  await prisma.transaction.create({
    data: {
      userId,
      kind: data.kind,
      amount: data.amount,
      date: new Date(data.date),
      note: data.note,
      description: data.description,
      merchantKey: normalizeMerchant(data.description ?? data.note),
      categoryId: data.categoryId,
      accountId: await ownedAccountId(userId, data.accountId),
      transferAccountId:
        data.kind === "TRANSFER"
          ? await ownedAccountId(userId, data.transferAccountId)
          : null,
      excludeFromStats: data.excludeFromStats,
      ...(tags ? { tags: { connect: tags.set } } : {}),
    },
  });

  revalidateAll();
  return ACTION_OK;
}

// La captura rápida del botón flotante: monto, categoría y poco más. Comparte
// tabla y validación con el formulario largo, pero no exige lo que ahí sí.
export async function createQuickTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = quickTransactionSchema.safeParse({
    kind: formData.get("kind") ?? "EXPENSE",
    amount: formData.get("amount"),
    date: formData.get("date"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = parsed.data;
  await prisma.transaction.create({
    data: {
      userId,
      kind: data.kind,
      amount: data.amount,
      date: new Date(data.date),
      description: data.description,
      merchantKey: normalizeMerchant(data.description),
      categoryId: data.categoryId,
      accountId: await ownedAccountId(userId, data.accountId),
    },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Aquí no sirve updateMany porque hay que tocar la relación de etiquetas,
  // así que primero se comprueba que el movimiento sea de quien lo edita.
  const owned = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!owned) return NOT_FOUND;

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
      accountId: await ownedAccountId(userId, data.accountId),
      transferAccountId:
        data.kind === "TRANSFER"
          ? await ownedAccountId(userId, data.transferAccountId)
          : null,
      excludeFromStats: data.excludeFromStats,
      tags: tags ?? { set: [] },
    },
  });

  revalidateAll();
  return ACTION_OK;
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  await prisma.transaction.deleteMany({ where: { id, userId } });
  revalidateAll();
}
