"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toNumber } from "@/lib/utils";
import { buildTransactionWhere } from "@/modules/transactions/query";

// La búsqueda del Control Hub. Solo devuelve lo que cabe en la isla: si hiciera
// falta más, la respuesta correcta es ir a /movimientos con el filtro puesto,
// que es justo lo que ofrece la última fila de resultados.
const LIMIT = 5;

export type SearchHit = {
  kind: "transaction" | "category";
  id: string;
  title: string;
  detail: string;
  href: string;
  color?: string;
  icon?: string | null;
};

export async function searchEverything(query: string): Promise<SearchHit[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const userId = await requireUserId();

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      // Reusa el mismo constructor que la página de movimientos y la
      // exportación: el filtro por usuario es su primer parámetro y no es
      // opcional, así que esta consulta no puede olvidarse de aplicarlo.
      where: buildTransactionWhere(userId, { q: term }),
      include: { category: { select: { name: true, color: true, icon: true } } },
      orderBy: { date: "desc" },
      take: LIMIT,
    }),
    prisma.category.findMany({
      where: { name: { contains: term, mode: "insensitive" }, archived: false },
      select: { id: true, name: true, color: true, icon: true },
      take: LIMIT,
    }),
  ]);

  const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });

  return [
    ...transactions.map((transaction): SearchHit => ({
      kind: "transaction",
      id: transaction.id,
      title: transaction.description || transaction.category?.name || "Movimiento",
      detail: `${dateFormat.format(transaction.date)} · ${toNumber(transaction.amount).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}`,
      href: `/movimientos?q=${encodeURIComponent(term)}`,
      color: transaction.category?.color,
      icon: transaction.category?.icon,
    })),
    ...categories.map((category): SearchHit => ({
      kind: "category",
      id: category.id,
      title: category.name,
      detail: "Ver sus movimientos",
      href: `/movimientos?categoryId=${category.id}`,
      color: category.color,
      icon: category.icon,
    })),
  ];
}
