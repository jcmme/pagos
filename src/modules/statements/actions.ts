"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dedupeHash } from "./dedupe";
import { recordRuleHits } from "./apply-rules";
import { restageImport } from "./stage";

export type ActionState = { error: string | null };

function revalidateAll(importId?: string) {
  revalidatePath("/importar");
  if (importId) revalidatePath(`/importar/${importId}`);
  revalidatePath("/movimientos");
  revalidatePath("/");
}

// Cambia la categoría sugerida de una fila y, si el usuario lo pide, deja
// aprendida la regla para que la próxima vez ese comercio caiga solo.
export async function recategorizeStaged(
  stagedId: string,
  categoryId: string | null,
  createRule: boolean
): Promise<ActionState> {
  const staged = await prisma.stagedTransaction.findUnique({
    where: { id: stagedId },
    select: { merchantKey: true, status: true },
  });
  if (!staged) return { error: "El movimiento ya no existe." };
  if (staged.status === "APPROVED") return { error: "Ese movimiento ya fue aprobado." };

  await prisma.stagedTransaction.update({
    where: { id: stagedId },
    data: { suggestedCategoryId: categoryId, confidence: null, matchedRuleId: null },
  });

  // La regla aprendida solo sugiere: nunca aprueba sola, y queda visible y
  // borrable en la pantalla de reglas.
  if (createRule && categoryId && staged.merchantKey) {
    await prisma.categoryRule.upsert({
      where: { pattern_matchType: { pattern: staged.merchantKey, matchType: "CONTAINS" } },
      create: {
        pattern: staged.merchantKey,
        matchType: "CONTAINS",
        categoryId,
        learned: true,
        priority: 10,
      },
      update: { categoryId, active: true },
    });
  }

  revalidateAll();
  return { error: null };
}

export async function setStagedStatus(stagedId: string, status: "PENDING" | "REJECTED") {
  await prisma.stagedTransaction.update({ where: { id: stagedId }, data: { status } });
  revalidateAll();
}

// Aprueba filas convirtiéndolas en movimientos reales. La unicidad de
// `transactionId` hace que un doble clic no pueda duplicar nada.
export async function approveStaged(stagedIds: string[]): Promise<ActionState> {
  if (stagedIds.length === 0) return { error: "No hay movimientos seleccionados." };

  const rows = await prisma.stagedTransaction.findMany({
    where: { id: { in: stagedIds }, transactionId: null },
    include: { import: { select: { accountId: true } } },
  });

  if (rows.length === 0) return { error: "Esos movimientos ya fueron aprobados." };

  for (const row of rows) {
    await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          kind: row.kind,
          amount: row.amount,
          date: row.date,
          description: row.rawDescription,
          merchantKey: row.merchantKey,
          categoryId: row.suggestedCategoryId,
          accountId: row.import.accountId,
          source: "IMPORTED",
          importId: row.importId,
          dedupeHash: dedupeHash({
            date: row.date,
            amount: Number(row.amount.toString()),
            merchantKey: row.merchantKey,
          }),
        },
      });

      await tx.stagedTransaction.update({
        where: { id: row.id },
        data: { status: "APPROVED", transactionId: created.id },
      });
    });
  }

  await recordRuleHits(rows.map((row) => row.matchedRuleId).filter((id): id is string => !!id));

  // Cuando ya no queda nada pendiente, la importación se marca revisada.
  const importIds = [...new Set(rows.map((row) => row.importId))];
  for (const importId of importIds) {
    const pending = await prisma.stagedTransaction.count({
      where: { importId, status: { in: ["PENDING", "DUPLICATE"] } },
    });
    await prisma.statementImport.update({
      where: { id: importId },
      data: { status: pending === 0 ? "COMPLETED" : "PARTIAL" },
    });
  }

  revalidateAll(importIds[0]);
  return { error: null };
}

export async function deleteImport(importId: string) {
  await prisma.statementImport.delete({ where: { id: importId } });
  revalidateAll();
}

// Vuelve a aplicar las reglas sobre la respuesta guardada. Útil después de
// crear reglas nuevas: no vuelve a llamar al modelo ni gasta cuota.
export async function reapplyRules(importId: string): Promise<ActionState> {
  try {
    await restageImport(importId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo reprocesar." };
  }

  await prisma.statementImport.update({
    where: { id: importId },
    data: { status: "READY", error: null },
  });

  revalidateAll(importId);
  return { error: null };
}

export async function setImportAccount(importId: string, accountId: string | null) {
  await prisma.statementImport.update({
    where: { id: importId },
    data: { accountId },
  });
  revalidateAll(importId);
}
