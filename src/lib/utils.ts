import { clsx, type ClassValue } from "clsx";
import { CURRENCY, LOCALE } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | { toString(): string }) {
  const numeric = typeof value === "number" ? value : Number(value.toString());
  return currencyFormatter.format(numeric);
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}

// Los Decimal y Date de Prisma no cruzan la frontera server -> client. Este
// helper los aplana conservando el tipo de entrada, para no repetir
// JSON.parse(JSON.stringify(...)) sin tipar en cada página.
export type Serialized<T> = T extends Date
  ? string
  : // Los primitivos van primero: un number también tiene toFixed y si no se
    // atrapa aquí, la rama de Decimal lo convertiría en string.
    T extends number | string | boolean | bigint | null | undefined
    ? T
    : T extends { toFixed(digits: number): string }
      ? string
      : T extends Array<infer U>
        ? Serialized<U>[]
        : T extends object
          ? { [K in keyof T]: Serialized<T[K]> }
          : T;

export function serialize<T>(value: T): Serialized<T> {
  return JSON.parse(JSON.stringify(value)) as Serialized<T>;
}

export function toNumber(value: number | string | { toString(): string }): number {
  return typeof value === "number" ? value : Number(value.toString());
}
