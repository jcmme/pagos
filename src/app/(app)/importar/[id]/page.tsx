import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serialize, toNumber } from "@/lib/utils";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function RevisarImportacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const record = await prisma.statementImport.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      rows: { orderBy: { rowIndex: "asc" } },
    },
  });

  if (!record) notFound();

  const categories = await prisma.category.findMany({
    where: { archived: false },
    include: { parent: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Si el estado de cuenta trae saldo final, se compara contra lo que suman
  // los movimientos: una diferencia significa que falta capturar algo.
  const approvedSum = record.rows
    .filter((row) => row.status === "APPROVED")
    .reduce(
      (sum, row) => sum + (row.kind === "INCOME" ? toNumber(row.amount) : -toNumber(row.amount)),
      0
    );

  const reconciliation =
    record.openingBalance !== null && record.closingBalance !== null
      ? {
          expected: toNumber(record.closingBalance) - toNumber(record.openingBalance),
          actual: approvedSum,
        }
      : null;

  return (
    <ReviewClient
      record={serialize(record)}
      categories={serialize(categories)}
      reconciliation={reconciliation}
    />
  );
}
