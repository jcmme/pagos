import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";

// Cuántos días antes se avisa. Es una lista, no un número: el usuario quiere
// un recordatorio dos días antes y otro el día previo, no una ventana continua
// que avise también a tres y a cero.
const DEFAULT_OFFSETS = [2, 1];

export function notifyOffsets(raw = process.env.NOTIFY_DAYS_BEFORE): number[] {
  if (!raw) return DEFAULT_OFFSETS;

  const offsets = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 30);

  // Una configuración rota no debe dejar la app sin avisos en silencio.
  if (offsets.length === 0) return DEFAULT_OFFSETS;

  return [...new Set(offsets)].sort((a, b) => b - a);
}

// La fecha límite de una tarjeta se comporta igual que un pago fijo mensual,
// así que reutiliza el mismo cálculo, que ya trabaja en UTC y recorta el día
// 31 en los meses cortos.
export function nextMonthlyDate(day: number, from = new Date()): Date {
  return computeNextDueDate({ frequency: "MONTHLY", dueDay: day, dueMonth: null }, from);
}

// Devuelve el offset que toca hoy, o null si hoy no toca avisar de esto.
export function offsetDueToday(
  dueDate: Date,
  offsets: number[],
  from = new Date()
): number | null {
  const days = daysUntil(dueDate, from);
  return offsets.includes(days) ? days : null;
}
