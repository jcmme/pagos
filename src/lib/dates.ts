import { TIME_ZONE } from "@/lib/constants";

export function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

// El mes en curso, en la zona de la app. Antes usaba `getMonth()` local, que
// en el servidor es UTC: el 31 a las 19:00 en CDMX ya era día 1 del mes
// siguiente para Vercel, y la app cambiaba de mes cinco horas antes de tiempo.
export function currentMonthYear() {
  const [year, month] = todayISO().split("-").map(Number);
  return { month, year };
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

/**
 * El día de hoy en la zona de la app, como "AAAA-MM-DD".
 *
 * Es lo que hay que usar en cualquier sitio donde antes se escribía
 * `new Date().toISOString().slice(0, 10)`. Esa forma toma el instante y lo
 * pasa a UTC: a las 20:30 en CDMX devuelve el día siguiente, así que todo lo
 * capturado de tarde-noche caía en el día equivocado —y un gasto del último
 * día del mes, en el presupuesto del mes siguiente—.
 *
 * `en-CA` se usa solo porque su formato corto es exactamente AAAA-MM-DD; el
 * idioma de la app sigue siendo LOCALE. Y funciona igual en el navegador y en
 * el servidor, que es justo lo que hacía falta.
 */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** El día de calendario de una fecha ya guardada, como "AAAA-MM-DD". Las
 *  fechas se guardan como medianoche UTC del día, así que se leen en UTC. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
