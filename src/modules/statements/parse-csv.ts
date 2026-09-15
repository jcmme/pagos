import Papa from "papaparse";
import type { ExtractedRow, ExtractedStatement } from "@/lib/ai/gemini";

// Los bancos nombran las columnas de formas distintas; se aceptan los alias
// más comunes en español e inglés.
const DATE_KEYS = ["fecha", "date", "fecha de operacion", "fecha operacion"];
const AMOUNT_KEYS = ["monto", "amount", "importe", "cantidad"];
const CHARGE_KEYS = ["cargo", "cargos", "retiro", "debito", "debit"];
const CREDIT_KEYS = ["abono", "abonos", "deposito", "credito", "credit"];
const DESC_KEYS = ["descripcion", "description", "concepto", "nota", "note", "detalle"];

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && String(value).trim() !== "") return String(value);
  }
  return undefined;
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  // Quita símbolo de moneda y separadores de miles.
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "");
  const value = Number(cleaned.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // dd/mm/yyyy y dd-mm-yyyy son lo normal en México; Date() los interpreta
  // como mm/dd, así que se reordenan a mano.
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, day, month, yearRaw] = dmy;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseStatementCsv(content: string): ExtractedStatement {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) =>
      header
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, ""),
  });

  // Si la columna de monto trae signos, el negativo significa cargo y el
  // positivo abono. Si nunca aparece un negativo (típico de estados de cuenta
  // de tarjeta), todo se asume cargo. Hay que saberlo antes de recorrer.
  const columnIsSigned = result.data.some((raw) => {
    const single = parseAmount(pick(raw, AMOUNT_KEYS));
    return single !== null && single < 0;
  });

  const rows: ExtractedRow[] = [];

  for (const raw of result.data) {
    const date = parseDate(pick(raw, DATE_KEYS));
    if (!date) continue;

    const description = pick(raw, DESC_KEYS) ?? "Movimiento";

    // Formato de dos columnas (cargo/abono) o de una sola con signo.
    const charge = parseAmount(pick(raw, CHARGE_KEYS));
    const credit = parseAmount(pick(raw, CREDIT_KEYS));
    let amount: number | null = null;
    let kind: ExtractedRow["kind"] = "EXPENSE";

    if (charge !== null && charge !== 0) {
      amount = Math.abs(charge);
      kind = "EXPENSE";
    } else if (credit !== null && credit !== 0) {
      amount = Math.abs(credit);
      kind = "INCOME";
    } else {
      const single = parseAmount(pick(raw, AMOUNT_KEYS));
      if (single === null || single === 0) continue;
      amount = Math.abs(single);
      kind = columnIsSigned && single > 0 ? "INCOME" : "EXPENSE";
    }

    if (amount === null) continue;
    rows.push({ date, description: description.trim(), amount, kind });
  }

  return { rows };
}
