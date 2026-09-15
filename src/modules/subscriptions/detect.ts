import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

const MIN_OCCURRENCES = 3;
const LOOKBACK_MONTHS = 6;
// Tolerancia sobre la cadencia: un cobro "mensual" puede caer entre 25 y 35
// días según el banco y los fines de semana.
const CADENCE_TOLERANCE_DAYS = 6;
// Un cobro de suscripción varía poco; más de 25% de diferencia sugiere que son
// compras distintas en el mismo comercio.
const AMOUNT_TOLERANCE = 0.25;

export type DetectedSubscription = {
  merchantKey: string;
  label: string;
  lastAmount: number;
  previousAmount: number | null;
  cadenceDays: number;
  occurrences: number;
  lastChargeAt: Date;
};

// Busca cargos repetidos del mismo comercio con monto parecido y separación
// regular. Es la base de "tienes una suscripción que no habías registrado" y
// de la alerta de aumento de precio.
export async function detectSubscriptions(now = new Date()): Promise<DetectedSubscription[]> {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - LOOKBACK_MONTHS, 1));

  const transactions = await prisma.transaction.findMany({
    where: {
      kind: "EXPENSE",
      date: { gte: since },
      merchantKey: { not: null },
    },
    select: { merchantKey: true, amount: true, date: true, description: true },
    orderBy: { date: "asc" },
  });

  const byMerchant = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    if (!tx.merchantKey) continue;
    const list = byMerchant.get(tx.merchantKey) ?? [];
    list.push(tx);
    byMerchant.set(tx.merchantKey, list);
  }

  const detected: DetectedSubscription[] = [];

  for (const [merchantKey, charges] of byMerchant) {
    if (charges.length < MIN_OCCURRENCES) continue;

    const amounts = charges.map((charge) => toNumber(charge.amount));
    const median = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];

    // Solo se consideran los cargos cercanos al monto típico: así un aumento de
    // precio no rompe la detección, pero una compra suelta grande no la ensucia.
    const consistent = charges.filter((charge, index) => {
      const diff = Math.abs(amounts[index] - median);
      return median > 0 && diff / median <= AMOUNT_TOLERANCE;
    });

    if (consistent.length < MIN_OCCURRENCES) continue;

    const gaps: number[] = [];
    for (let i = 1; i < consistent.length; i++) {
      const gap =
        (consistent[i].date.getTime() - consistent[i - 1].date.getTime()) / 86_400_000;
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const regular = gaps.every((gap) => Math.abs(gap - avgGap) <= CADENCE_TOLERANCE_DAYS);
    // Menos de una semana entre cargos no es una suscripción, es uso frecuente.
    if (!regular || avgGap < 7) continue;

    const last = consistent[consistent.length - 1];
    const previous = consistent[consistent.length - 2];

    detected.push({
      merchantKey,
      label: last.description ?? merchantKey,
      lastAmount: toNumber(last.amount),
      previousAmount: previous ? toNumber(previous.amount) : null,
      cadenceDays: Math.round(avgGap),
      occurrences: consistent.length,
      lastChargeAt: last.date,
    });
  }

  return detected.sort((a, b) => b.lastAmount - a.lastAmount);
}

// Guarda lo detectado conservando el estado que el usuario ya haya fijado
// (confirmada o descartada), para no volver a sugerir lo mismo cada mes.
export async function syncSubscriptions(now = new Date()) {
  const detected = await detectSubscriptions(now);

  for (const item of detected) {
    await prisma.subscription.upsert({
      where: { merchantKey: item.merchantKey },
      create: {
        merchantKey: item.merchantKey,
        label: item.label,
        lastAmount: item.lastAmount,
        previousAmount: item.previousAmount,
        cadenceDays: item.cadenceDays,
        occurrences: item.occurrences,
        lastChargeAt: item.lastChargeAt,
      },
      update: {
        label: item.label,
        lastAmount: item.lastAmount,
        previousAmount: item.previousAmount,
        cadenceDays: item.cadenceDays,
        occurrences: item.occurrences,
        lastChargeAt: item.lastChargeAt,
      },
    });
  }

  return detected.length;
}
