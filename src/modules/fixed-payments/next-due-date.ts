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
