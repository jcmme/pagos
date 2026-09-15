import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function dedupeHash(input: {
  date: string | Date;
  amount: number;
  merchantKey: string | null;
}): string {
  const day =
    typeof input.date === "string" ? input.date.slice(0, 10) : input.date.toISOString().slice(0, 10);
  return createHash("sha1")
    .update(`${day}|${input.amount.toFixed(2)}|${input.merchantKey ?? ""}`)
    .digest("hex");
}

// Busca movimientos ya registrados que coincidan en día, monto y comercio.
// Deliberadamente NO es una restricción única: dos cafés iguales el mismo día
// son legítimos. Solo marca la fila para que el usuario decida en la bandeja.
export async function findPossibleDuplicates(
  hashes: string[]
): Promise<Map<string, string>> {
  if (hashes.length === 0) return new Map();

  const matches = await prisma.transaction.findMany({
    where: { dedupeHash: { in: hashes } },
    select: { id: true, dedupeHash: true },
  });

  const map = new Map<string, string>();
  for (const match of matches) {
    if (match.dedupeHash && !map.has(match.dedupeHash)) {
      map.set(match.dedupeHash, match.id);
    }
  }
  return map;
}
