import { daysUntil } from "@/modules/fixed-payments/next-due-date";
import { nextMonthlyDate } from "@/modules/reminders/schedule";
import type { AccountWithBalance } from "./balance";

// Lo que de verdad se quiere saber de una tarjeta de crédito: cuánto se ha
// usado del límite, cuándo cierra el periodo y cuántos días faltan para la
// fecha límite de pago.
//
// Vive aparte porque ahora lo usan dos vistas —la página de cuentas y el
// carrusel del Resumen— y si cada una lo calculara, tarde o temprano dirían
// cosas distintas de la misma tarjeta.

export type CardStatus = {
  /** El saldo de una tarjeta es negativo cuando se debe: lo usado es su valor absoluto. */
  used: number;
  limit: number | null;
  cutoffDays: number | null;
  dueDays: number | null;
  /** Sin ningún dato configurado no hay nada que mostrar, solo que pedirlo. */
  configured: boolean;
};

export function cardStatus(
  account: Pick<
    AccountWithBalance,
    "balance" | "creditLimit" | "cutoffDay" | "paymentDueDay"
  >,
  now = new Date()
): CardStatus {
  return {
    used: account.balance < 0 ? Math.abs(account.balance) : 0,
    limit: account.creditLimit,
    cutoffDays: account.cutoffDay
      ? daysUntil(nextMonthlyDate(account.cutoffDay, now), now)
      : null,
    dueDays: account.paymentDueDay
      ? daysUntil(nextMonthlyDate(account.paymentDueDay, now), now)
      : null,
    configured: Boolean(
      account.cutoffDay || account.paymentDueDay || account.creditLimit
    ),
  };
}

/** "hoy", "mañana", "en 5 d" — corto porque siempre va dentro de una tarjeta. */
export function daysLabel(days: number) {
  if (days < 0) return "vencido";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} d`;
}
