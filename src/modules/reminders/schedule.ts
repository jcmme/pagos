import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";

// Cuántos días antes se avisa, de más lejano a más cercano: un recordatorio
// dos días antes y otro el día previo. Es una lista y no un número porque no
// es una ventana continua; con un solo número también avisaría a tres y a
// cero días, que era justo lo que molestaba.
//
// Vive aquí y no en una variable de entorno a propósito. Es una decisión de
// producto de una app de una sola casa, no configuración por despliegue, y
// tenerla en el panel de Vercel solo abría la puerta a que un valor viejo
// dejara los avisos en un día equivocado sin que nada lo señalara.
export const NOTIFY_OFFSETS = [2, 1] as const;

export function notifyOffsets(): number[] {
  return [...NOTIFY_OFFSETS];
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
