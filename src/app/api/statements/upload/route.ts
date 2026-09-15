import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractFromFile } from "@/modules/statements/extract";
import { stageExtractedRows } from "@/modules/statements/stage";

// Tiene que ser route handler y no server action: las server actions topan en
// 1 MB de body y un estado de cuenta en PDF lo pasa con facilidad.
//
// Subida y extracción van juntas porque el binario no se guarda: separarlas
// obligaría al usuario a elegir el archivo dos veces. Lo que sí se guarda es
// la respuesta cruda del extractor, así que reintentar el armado de la bandeja
// nunca vuelve a gastar cuota del modelo.
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

const ACCEPTED = [
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const accountIdRaw = formData.get("accountId");
  const accountId =
    typeof accountIdRaw === "string" && accountIdRaw !== "none" ? accountIdRaw : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo pesa más de 4 MB. Sube el estado de cuenta de un solo periodo." },
      { status: 400 }
    );
  }

  const isCsvName = file.name.toLowerCase().endsWith(".csv");
  const mimeType = isCsvName ? "text/csv" : file.type || "application/octet-stream";

  if (!ACCEPTED.includes(mimeType)) {
    return NextResponse.json(
      { error: "Formato no soportado. Sube un PDF o un CSV." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const existing = await prisma.statementImport.findUnique({
    where: { fileHash },
    select: { id: true, status: true },
  });

  // Solo se rechaza si el intento anterior llegó a buen puerto. Si falló a
  // medias, se reutiliza el registro para no dejarlo bloqueado para siempre.
  if (existing && existing.status !== "FAILED") {
    return NextResponse.json(
      { error: "Ya habías subido este mismo archivo.", importId: existing.id },
      { status: 409 }
    );
  }

  const parser = mimeType === "application/pdf" ? "gemini" : "csv";

  const record = existing
    ? await prisma.statementImport.update({
        where: { id: existing.id },
        data: { status: "EXTRACTING", error: null, accountId },
        select: { id: true },
      })
    : await prisma.statementImport.create({
        data: {
          fileName: file.name,
          fileHash,
          mimeType,
          parser,
          accountId,
          status: "EXTRACTING",
        },
        select: { id: true },
      });

  try {
    const extracted = await extractFromFile(buffer, mimeType);

    await prisma.statementImport.update({
      where: { id: record.id },
      data: {
        rawResponse: JSON.parse(JSON.stringify(extracted)),
        periodStart: extracted.periodStart ? new Date(extracted.periodStart) : null,
        periodEnd: extracted.periodEnd ? new Date(extracted.periodEnd) : null,
        openingBalance: extracted.openingBalance ?? null,
        closingBalance: extracted.closingBalance ?? null,
      },
    });

    const { rows } = await stageExtractedRows(record.id, extracted);

    await prisma.statementImport.update({
      where: { id: record.id },
      data: {
        status: rows > 0 ? "READY" : "FAILED",
        error: rows > 0 ? null : "No se encontraron movimientos en el archivo.",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ importId: record.id, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al procesar";
    await prisma.statementImport.update({
      where: { id: record.id },
      data: { status: "FAILED", error: message },
    });
    return NextResponse.json({ error: message, importId: record.id }, { status: 422 });
  }
}
