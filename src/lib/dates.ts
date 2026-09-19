export function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function shiftMonth(month: number, year: number, delta: number) {
  const base = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: base.getUTCMonth() + 1, year: base.getUTCFullYear() };
}

// La semana empieza en lunes, como en México. getUTCDay() devuelve 0 para el
// domingo, así que el corrimiento lo lleva al final. Esta fórmula ya estaba
// escrita dos veces (el calendario de pagos y la detección de suscripciones);
// vive aquí para que no haya una tercera.
export function weekdayIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

/** Lunes 00:00 UTC al lunes siguiente, sin incluirlo. */
export function weekRange(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = new Date(today - weekdayIndex(now) * 86_400_000);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}

export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];
