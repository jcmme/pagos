type Frequency = "MONTHLY" | "WEEKLY" | "YEARLY";

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export function computeNextDueDate(
  payment: { frequency: Frequency; dueDay: number; dueMonth: number | null },
  from: Date = new Date()
): Date {
  const today = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  if (payment.frequency === "MONTHLY") {
    const day = clampDay(today.getUTCFullYear(), today.getUTCMonth(), payment.dueDay);
    let candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day));
    if (candidate < today) {
      const nextMonth = today.getUTCMonth() + 1;
      const nextDay = clampDay(today.getUTCFullYear(), nextMonth, payment.dueDay);
      candidate = new Date(Date.UTC(today.getUTCFullYear(), nextMonth, nextDay));
    }
    return candidate;
  }

  if (payment.frequency === "WEEKLY") {
    const targetIso = ((payment.dueDay - 1) % 7) + 1; // 1=Mon..7=Sun
    const todayIso = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
    let diff = targetIso - todayIso;
    if (diff < 0) diff += 7;
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + diff));
  }

  // YEARLY
  const month = (payment.dueMonth ?? 1) - 1;
  const day = clampDay(today.getUTCFullYear(), month, payment.dueDay);
  let candidate = new Date(Date.UTC(today.getUTCFullYear(), month, day));
  if (candidate < today) {
    const nextDay = clampDay(today.getUTCFullYear() + 1, month, payment.dueDay);
    candidate = new Date(Date.UTC(today.getUTCFullYear() + 1, month, nextDay));
  }
  return candidate;
}

export function daysUntil(date: Date, from: Date = new Date()) {
  const today = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Si el pago ya se cubrió en el ciclo que está corriendo.
 *
 * Existe porque el botón "Pagado" escribía `lastPaidAt` y **nadie lo leía**:
 * marcabas la renta como pagada, registrabas el movimiento —y el saldo ya
 * bajaba—, pero el disponible seguía apartando el importe otra vez y la
 * tarjeta del Resumen seguía diciendo que vencía. El pago se descontaba dos
 * veces hasta que pasaba el día.
 *
 * "El ciclo que corre" es la ventana que termina en el próximo vencimiento y
 * dura un periodo hacia atrás. Así pagar cuatro días antes cuenta —es lo
 * normal—, y en cuanto el vencimiento pasa y el siguiente se corre un mes, esa
 * misma fecha deja de contar sola, sin tener que limpiar nada.
 */
export function isPaidForCycle(
  payment: { frequency: Frequency; dueDay: number; dueMonth: number | null; lastPaidAt: Date | null },
  from: Date = new Date()
): boolean {
  if (!payment.lastPaidAt) return false;

  const next = computeNextDueDate(payment, from);
  const inicio = new Date(next);
  if (payment.frequency === "WEEKLY") inicio.setUTCDate(inicio.getUTCDate() - 7);
  else if (payment.frequency === "YEARLY") inicio.setUTCFullYear(inicio.getUTCFullYear() - 1);
  else inicio.setUTCMonth(inicio.getUTCMonth() - 1);

  return payment.lastPaidAt > inicio;
}
