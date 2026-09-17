import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { nextMonthlyDate } from "@/modules/reminders/schedule";
import { generateInsights, type Insight } from "@/modules/insights/generate";
import { urgencyPhrase, urgencyTone } from "./urgency";

export type NotificationTone = "danger" | "warning" | "accent" | "info" | "success";

/** De dónde salió el aviso. Decide el icono; el tono decide el color. */
export type NotificationKind = "PAYMENT" | "CARD" | "CUTOFF" | "INSIGHT" | "IMPORT";

export type NotificationItem = {
  /**
   * Estable, y con la fecha dentro cuando el aviso es de un vencimiento:
   * descartar la colegiatura de octubre no debe silenciar la de noviembre.
   */
  key: string;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  detail: string;
  href?: string;
  /** Días que faltan; null cuando el aviso no tiene fecha y ordena al final. */
  daysLeft: number | null;
};

// Cuánto se asoma la campana hacia adelante. Los pagos avisan con una semana
// porque hay que mover dinero; el corte de tarjeta es informativo (dice cuánto
// vas a tener que pagar) y con tres días basta para no volverse ruido fijo.
const PAYMENT_HORIZON_DAYS = 7;
const CUTOFF_HORIZON_DAYS = 3;

const INSIGHT_TONES: Record<Insight["tone"], NotificationTone> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

// Dentro del horizonte urgencyTone nunca devuelve "neutral" (eso es a más de
// siete días), pero el tipo lo permite, así que se estrecha aquí.
function dueTone(days: number): NotificationTone {
  const tone = urgencyTone(days);
  return tone === "neutral" ? "accent" : tone;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Todo lo que este usuario tiene pendiente de atender, en un solo lugar.
 *
 * Reúne cuatro fuentes que ya existían pero estaban dispersas —los pagos
 * próximos se calculaban dentro del dashboard, los avisos automáticos en el
 * módulo de insights y los recordatorios en el cron— para que la campana, el
 * dashboard y el cron no puedan discrepar sobre qué está por vencer.
 */
export async function getNotifications(
  userId: string,
  now = new Date()
): Promise<NotificationItem[]> {
  const [payments, cards, insights, pendingRows, imports, dismissed] = await Promise.all([
    prisma.fixedPayment.findMany({
      // Mismo filtro que el cron de avisos: los ingresos no se "pagan".
      where: { userId, active: true, kind: "EXPENSE" },
      select: {
        id: true,
        name: true,
        amount: true,
        frequency: true,
        dueDay: true,
        dueMonth: true,
      },
    }),
    prisma.account.findMany({
      where: { userId, type: "CREDIT_CARD", archived: false },
      select: { id: true, name: true, cutoffDay: true, paymentDueDay: true },
    }),
    generateInsights(userId, now),
    prisma.stagedTransaction.groupBy({
      by: ["importId"],
      where: { status: { in: ["PENDING", "DUPLICATE"] }, import: { userId } },
      _count: { _all: true },
    }),
    prisma.statementImport.findMany({
      where: {
        userId,
        status: { in: ["UPLOADED", "EXTRACTING", "READY", "PARTIAL", "FAILED"] },
      },
      select: { id: true, fileName: true, status: true },
    }),
    // generateInsights ya filtra sus propias claves descartadas; esta lectura
    // es para las demás fuentes, que no pasan por ahí.
    prisma.insightDismissal.findMany({ where: { userId }, select: { key: true } }),
  ]);

  const items: NotificationItem[] = [];

  // --- Pagos fijos ---------------------------------------------------------
  // computeNextDueDate nunca devuelve una fecha pasada, así que aquí los días
  // van de 0 a 7: "vencido" no es representable con un pago recurrente.
  for (const payment of payments) {
    const due = computeNextDueDate(payment, now);
    const days = daysUntil(due, now);
    if (days > PAYMENT_HORIZON_DAYS) continue;

    items.push({
      key: `pago:${payment.id}:${dayKey(due)}`,
      kind: "PAYMENT",
      tone: dueTone(days),
      title: payment.name,
      detail: `${formatCurrency(payment.amount)} · vence ${urgencyPhrase(days)}`,
      href: "/pagos",
      daysLeft: days,
    });
  }

  // --- Tarjetas de crédito -------------------------------------------------
  for (const card of cards) {
    if (card.paymentDueDay) {
      const due = nextMonthlyDate(card.paymentDueDay, now);
      const days = daysUntil(due, now);
      if (days <= PAYMENT_HORIZON_DAYS) {
        items.push({
          key: `tarjeta-pago:${card.id}:${dayKey(due)}`,
          kind: "CARD",
          tone: dueTone(days),
          title: `Pago de ${card.name}`,
          detail: `La fecha límite es ${urgencyPhrase(days)}`,
          href: "/cuentas",
          daysLeft: days,
        });
      }
    }

    if (card.cutoffDay) {
      const cutoff = nextMonthlyDate(card.cutoffDay, now);
      const days = daysUntil(cutoff, now);
      if (days <= CUTOFF_HORIZON_DAYS) {
        items.push({
          key: `tarjeta-corte:${card.id}:${dayKey(cutoff)}`,
          kind: "CUTOFF",
          tone: "info",
          title: `Corte de ${card.name}`,
          detail: `El periodo cierra ${urgencyPhrase(days)}`,
          href: "/cuentas",
          daysLeft: days,
        });
      }
    }
  }

  // --- Avisos automáticos --------------------------------------------------
  for (const insight of insights) {
    items.push({
      key: insight.key,
      kind: "INSIGHT",
      tone: INSIGHT_TONES[insight.tone],
      title: insight.title,
      detail: insight.detail,
      href: insight.href,
      daysLeft: null,
    });
  }

  // --- Estados de cuenta ---------------------------------------------------
  const importNames = new Map(imports.map((row) => [row.id, row.fileName]));

  for (const row of pendingRows) {
    const count = row._count._all;
    items.push({
      key: `importacion-pendiente:${row.importId}`,
      kind: "IMPORT",
      tone: "info",
      title: count === 1 ? "1 movimiento por revisar" : `${count} movimientos por revisar`,
      detail: importNames.get(row.importId) ?? "Estado de cuenta importado",
      href: `/importar/${row.importId}`,
      daysLeft: null,
    });
  }

  for (const row of imports) {
    if (row.status !== "FAILED" && row.status !== "PARTIAL") continue;
    items.push({
      key: `importacion-error:${row.id}`,
      kind: "IMPORT",
      tone: row.status === "FAILED" ? "danger" : "warning",
      title:
        row.status === "FAILED"
          ? "No se pudo leer un estado de cuenta"
          : "Un estado de cuenta quedó a medias",
      detail: row.fileName,
      href: `/importar/${row.id}`,
      daysLeft: null,
    });
  }

  const dismissedKeys = new Set(dismissed.map((row) => row.key));

  return items
    .filter((item) => !dismissedKeys.has(item.key))
    .sort((a, b) => (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER));
}
