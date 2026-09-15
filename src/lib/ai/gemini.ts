import { GoogleGenAI } from "@google/genai";

// El id del modelo es configurable porque Google los rota con frecuencia; el
// default es el Flash vigente de la capa gratuita.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export type ExtractedRow = {
  date: string;
  description: string;
  amount: number;
  kind: "EXPENSE" | "INCOME";
};

export type ExtractedStatement = {
  bank?: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
  rows: ExtractedRow[];
};

export function isGeminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    bank: { type: "string" },
    periodStart: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
    periodEnd: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
    openingBalance: { type: "number" },
    closingBalance: { type: "number" },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha ISO YYYY-MM-DD" },
          description: { type: "string" },
          amount: { type: "number", description: "Siempre positivo" },
          kind: { type: "string", enum: ["EXPENSE", "INCOME"] },
        },
        required: ["date", "description", "amount", "kind"],
      },
    },
  },
  required: ["rows"],
};

const PROMPT = `Eres un extractor de movimientos de estados de cuenta bancarios mexicanos.

Extrae TODOS los movimientos del documento. Reglas:
- "amount" siempre positivo. Usa "kind" para el signo: cargos/compras/retiros = EXPENSE, abonos/depósitos/pagos recibidos = INCOME.
- "date" en formato YYYY-MM-DD. Si el estado de cuenta solo trae día y mes, usa el año del periodo del estado de cuenta.
- "description" es el texto del movimiento tal como aparece, sin recortar.
- No inventes movimientos. No incluyas saldos, subtotales, comisiones informativas ni líneas de resumen.
- Si el documento no es un estado de cuenta, devuelve rows vacío.`;

export async function extractStatement(
  fileBase64: string,
  mimeType: string
): Promise<ExtractedStatement> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      { type: "text", text: PROMPT },
      { type: "document", data: fileBase64, mime_type: mimeType },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESPONSE_SCHEMA,
    },
  });

  const text = interaction.output_text;
  if (!text) {
    throw new Error("El modelo no devolvió contenido.");
  }

  return JSON.parse(text) as ExtractedStatement;
}
