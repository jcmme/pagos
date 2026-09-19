import { CURRENCY, LOCALE } from "@/lib/constants";

// formatCurrency (src/lib/utils.ts) redondea a pesos enteros a propósito: en
// una lista de movimientos los centavos son ruido. Pero la cifra grande del
// Resumen sí los lleva, en chico, y para eso hace falta la cantidad partida en
// piezas en vez de una sola cadena. Son dos necesidades distintas, así que son
// dos formateadores, y el de las listas no se toca.

const partsFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type MoneyParts = {
  /** "-" cuando la cantidad es negativa; cadena vacía si no. */
  sign: string;
  /** La parte entera ya con separadores de miles. */
  integer: string;
  /** Los dos decimales, sin el separador. */
  cents: string;
  /** El separador decimal del idioma, para poder escribirlo entre ambos. */
  decimalSeparator: string;
  /** El símbolo de la moneda, para renderizarlo con su propio tamaño. */
  currency: string;
};

export function formatMoneyParts(value: number): MoneyParts {
  // formatToParts evita tener que adivinar dónde separa cada idioma: el
  // navegador ya sabe que es-MX usa punto para miles y coma para decimales.
  const parts = partsFormatter.formatToParts(Math.abs(value));
  const pick = (type: Intl.NumberFormatPartTypes) =>
    parts.filter((part) => part.type === type).map((part) => part.value).join("");

  return {
    sign: value < 0 ? "-" : "",
    integer: parts
      .filter((part) => part.type === "integer" || part.type === "group")
      .map((part) => part.value)
      .join(""),
    cents: pick("fraction") || "00",
    decimalSeparator: pick("decimal") || ".",
    currency: pick("currency").trim(),
  };
}

/** Para espacios estrechos: 12 651 → "12.7k". Debajo de mil, la cifra entera. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs < 1000) return `${sign}${Math.round(abs)}`;
  if (abs < 1_000_000) {
    const thousands = abs / 1000;
    // 9.4k se lee bien; 94.3k ya no cabe, y a esa escala el decimal no informa.
    return `${sign}${thousands < 10 ? thousands.toFixed(1) : Math.round(thousands)}k`;
  }
  return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
}
