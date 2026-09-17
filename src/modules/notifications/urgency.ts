// Tono y texto de urgencia a partir de los días que faltan. Vive en su propio
// módulo porque lo usan el dashboard y la campana de avisos: con una copia en
// cada uno acabarían describiendo el mismo pago de formas distintas.

export type UrgencyTone = "danger" | "warning" | "accent" | "neutral";

export function urgencyTone(days: number): UrgencyTone {
  if (days <= 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "accent";
  return "neutral";
}

/** Etiqueta corta, para una insignia: "Hoy", "Mañana", "3 días". */
export function urgencyLabel(days: number) {
  if (days < 0) return "Vencido";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} días`;
}

/** Frase para meter dentro de una oración: "vence hoy", "cierra en 3 días". */
export function urgencyPhrase(days: number) {
  if (days < 0) return `hace ${Math.abs(days)} días`;
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}
