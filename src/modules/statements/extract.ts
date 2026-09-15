import { extractStatement, isGeminiEnabled, type ExtractedStatement } from "@/lib/ai/gemini";
import { parseStatementCsv } from "./parse-csv";

// El CSV se procesa con un parser determinista y gratuito; el PDF necesita el
// modelo porque cada banco lo maqueta distinto.
export async function extractFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedStatement> {
  const isCsv = mimeType.includes("csv") || mimeType === "text/plain";

  if (isCsv) {
    return parseStatementCsv(buffer.toString("utf8"));
  }

  if (!isGeminiEnabled()) {
    throw new Error(
      "Para leer PDFs falta configurar GEMINI_API_KEY. Mientras tanto puedes importar el CSV que te da tu banco."
    );
  }

  return extractStatement(buffer.toString("base64"), mimeType);
}
