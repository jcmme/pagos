// Cada pilar declara si pudo calcularse. Es deliberado: mostrar 0% de tasa de
// ahorro cuando en realidad no hay ingresos registrados sería mentirle al
// usuario, así que la UI distingue "va mal" de "faltan datos".
export type Metric = {
  available: boolean;
  /** Razón por la que no se pudo calcular, para mostrarla tal cual. */
  reason?: string;
  value: number;
  /** Valor de referencia recomendado. */
  target: number;
  /** 0-100, qué tan cerca está de la meta. */
  score: number;
};

export function unavailable(reason: string, target: number): Metric {
  return { available: false, reason, value: 0, target, score: 0 };
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
