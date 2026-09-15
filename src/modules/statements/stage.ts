import { prisma } from "@/lib/prisma";
import { normalizeMerchant } from "@/lib/merchant";
import type { ExtractedStatement } from "@/lib/ai/gemini";
import { dedupeHash, findPossibleDuplicates } from "./dedupe";
import { buildRuleMatcher } from "./apply-rules";

// Convierte lo extraído en filas de la bandeja, aplicando las reglas del
// usuario y marcando posibles duplicados.
export async function stageExtractedRows(
  importId: string,
  extracted: ExtractedStatement
): Promise<{ rows: number }> {
  // Al reprocesar se descartan las filas pendientes anteriores, pero se
  // conservan las que el usuario ya aprobó o rechazó.
  await prisma.stagedTransaction.deleteMany({
    where: { importId, status: { in: ["PENDING", "DUPLICATE"] } },
  });

  const matchRule = await buildRuleMatcher();

  const prepared = extracted.rows
    .filter((row) => row.amount > 0 && !Number.isNaN(new Date(row.date).getTime()))
    .map((row, index) => {
      const merchantKey = normalizeMerchant(row.description);
      const suggestion = matchRule(row.description);

      return {
        importId,
        rowIndex: index,
        rawDescription: row.description,
        date: new Date(row.date),
        amount: row.amount,
        kind: row.kind,
        merchantKey,
        suggestedCategoryId: suggestion?.categoryId ?? null,
        matchedRuleId: suggestion?.ruleId ?? null,
        confidence: suggestion?.confidence ?? null,
        hash: dedupeHash({ date: row.date, amount: row.amount, merchantKey }),
      };
    });

  if (prepared.length === 0) return { rows: 0 };

  const duplicates = await findPossibleDuplicates(prepared.map((row) => row.hash));

  await prisma.stagedTransaction.createMany({
    data: prepared.map(({ hash, ...row }) => ({
      ...row,
      duplicateOfId: duplicates.get(hash) ?? null,
      status: duplicates.has(hash) ? ("DUPLICATE" as const) : ("PENDING" as const),
    })),
  });

  return { rows: prepared.length };
}

// Rearma la bandeja desde la respuesta guardada. Sirve para volver a aplicar
// las reglas después de crear reglas nuevas, sin gastar cuota del modelo.
export async function restageImport(importId: string): Promise<{ rows: number }> {
  const record = await prisma.statementImport.findUnique({
    where: { id: importId },
    select: { rawResponse: true },
  });

  if (!record?.rawResponse) {
    throw new Error("Esta importación no tiene contenido guardado para reprocesar.");
  }

  return stageExtractedRows(importId, record.rawResponse as unknown as ExtractedStatement);
}
