// Cambia esto si tu moneda o localización es distinta.
export const LOCALE = "es-MX";
export const CURRENCY = "MXN";

// Paleta de las gráficas y de los puntos de categoría. No son los acentos de
// la interfaz (esos siguen siendo los de iOS): los colores de marca son
// demasiado claros y saturados para distinguirse entre sí en una gráfica.
//
// Estos ocho están dentro de la banda de luminosidad para fondo oscuro, tienen
// croma suficiente para no leerse como gris, y en este orden los adyacentes se
// distinguen bajo daltonismo protán y deután. Si se cambian, hay que volver a
// validarlos en vez de elegirlos a ojo.
export const CATEGORY_COLORS = [
  "#d15c56",
  "#009bbe",
  "#a38300",
  "#c65b93",
  "#4087de",
  "#409d48",
  "#a269c9",
  "#c26f00",
];

export const MONTH_NAMES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  WEEKLY: "Semanal",
  YEARLY: "Anual",
};

export const DEBT_TYPE_LABELS: Record<string, string> = {
  OWE: "Yo debo",
  OWED: "Me deben",
};

export const TX_KIND_LABELS: Record<string, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  TRANSFER: "Transferencia",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Cuenta de cheques",
  SAVINGS: "Ahorro",
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de crédito",
  INVESTMENT: "Inversión",
  LOAN: "Préstamo",
};

export const RULE_MATCH_LABELS: Record<string, string> = {
  CONTAINS: "Contiene",
  STARTS_WITH: "Empieza con",
  EXACT: "Es exactamente",
  REGEX: "Expresión regular",
};

export const IMPORT_STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Subido",
  EXTRACTING: "Leyendo…",
  READY: "Listo para revisar",
  PARTIAL: "Revisado a medias",
  FAILED: "Falló",
  COMPLETED: "Revisado",
};

// Metas de referencia de las métricas de salud financiera y peso de cada
// pilar en el score. El score renormaliza sobre los pilares que sí se pueden
// calcular con los datos disponibles.
export const HEALTH_TARGETS = {
  savingsRate: 0.2,
  emergencyMonths: 6,
  emergencyMinMonths: 3,
  maxDebtToIncome: 0.36,
};

export const HEALTH_WEIGHTS = {
  savingsRate: 30,
  emergencyFund: 25,
  debtToIncome: 25,
  budgetAdherence: 20,
};
