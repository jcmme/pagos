import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildTransactionWhere, parseFilterParams } from "@/modules/transactions/query";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Comillas, comas y saltos de línea tienen que escaparse o rompen la columna.
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const where = buildTransactionWhere(parseFilterParams(params));

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { include: { parent: true } }, account: true, tags: true },
    orderBy: { date: "desc" },
  });

  const header = [
    "fecha",
    "tipo",
    "monto",
    "categoria",
    "subcategoria",
    "cuenta",
    "descripcion",
    "nota",
    "etiquetas",
  ];

  const lines = [
    header.join(","),
    ...transactions.map((tx) =>
      [
        tx.date.toISOString().slice(0, 10),
        tx.kind,
        tx.amount.toString(),
        tx.category?.parent?.name ?? tx.category?.name ?? "",
        tx.category?.parent ? tx.category.name : "",
        tx.account?.name ?? "",
        tx.description ?? "",
        tx.note ?? "",
        tx.tags.map((tag) => tag.name).join(" "),
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  // El BOM hace que Excel abra el archivo con los acentos correctos.
  const body = `﻿${lines.join("\n")}`;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos-${today}.csv"`,
    },
  });
}
