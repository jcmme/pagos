const MS_PER_MONTH = 30 * 86_400_000;

// Meses que faltan para la fecha objetivo. Vive fuera de los componentes
// porque leer el reloj durante el render los vuelve impuros.
export function monthsUntil(targetDate: Date | null, from: Date = new Date()): number | null {
  if (!targetDate) return null;
  return Math.max(1, Math.ceil((targetDate.getTime() - from.getTime()) / MS_PER_MONTH));
}
