// Los tres tamaños de icono de la app, y ninguno más.
//
// Antes había noventa iconos con doce tamaños distintos (11, 12, 13, 14, 15,
// 16, 17, 18, 19, 20, 21 y 26): el mismo bote de basura aparecía a 13, 14 y
// 15 según la pantalla. No era un criterio, eran noventa decisiones sueltas,
// y por eso no se veían como un mismo sistema.
//
// El grosor no se declara nunca: se deja el 2 que trae lucide por defecto.
// Un solo trazo, y menos código que antes.

export const ICON = {
  /** Dentro de una línea de texto, en insignias y en datos secundarios. */
  sm: 14,
  /** El de por defecto: menú, acciones de fila, botones. */
  md: 17,
  /** Encabezados y estados vacíos. */
  lg: 22,
} as const;

export type IconSize = keyof typeof ICON;
