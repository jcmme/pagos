// Cambia esto si tu moneda o localización es distinta.
export const LOCALE = "es-MX";
export const CURRENCY = "MXN";

export const CATEGORY_COLORS = [
  "#0a84ff",
  "#30d158",
  "#ff9f0a",
  "#ff453a",
  "#bf5af2",
  "#64d2ff",
  "#ffd60a",
  "#ff375f",
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
