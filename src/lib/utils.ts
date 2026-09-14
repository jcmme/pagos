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
