import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { weekRange, weekdayIndex, WEEKDAY_INITIALS } from "@/lib/dates";

export type DayTotal = {
  /** Día del mes, para poder enlazar al detalle. */
  date: Date;
  /** La inicial del día: L, M, M, J, V, S, D. */
  label: string;
  total: number;
  isToday: boolean;
  /** Los días que aún no llegan se dibujan apagados. */
  isFuture: boolean;
};

/**
 * Gasto de cada día de la semana en curso, de lunes a domingo.
 *
 * Es una consulta propia y no una derivación de los movimientos del mes que el
 * Resumen ya carga, porque una semana a caballo entre dos meses se saldría de
 * ese rango y los primeros días aparecerían en cero.
 */
export async function getWeekTotals(userId: string, now = new Date()): Promise<DayTotal[]> {
  const { start, end } = weekRange(now);

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      kind: "EXPENSE",
      excludeFromStats: false,
      date: { gte: start, lt: end },
    },
    select: { date: true, amount: true },
  });

  const totals = new Array(7).fill(0);
  for (const row of rows) {
    totals[weekdayIndex(row.date)] += toNumber(row.amount);
  }

  const todayIndex = weekdayIndex(now);

  return totals.map((total, index) => ({
    date: new Date(start.getTime() + index * 86_400_000),
    label: WEEKDAY_INITIALS[index],
    total,
    isToday: index === todayIndex,
    isFuture: index > todayIndex,
  }));
}
