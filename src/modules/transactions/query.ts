import type { Prisma } from "@prisma/client";
import type { TransactionFilter } from "./schema";

// Compartido por la página de movimientos y la exportación a CSV, para que
// "exportar" siempre devuelva exactamente lo que el usuario está viendo.
export function buildTransactionWhere(filter: TransactionFilter): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (filter.kind) where.kind = filter.kind;
  if (filter.categoryId) where.categoryId = filter.categoryId;
  if (filter.accountId) where.accountId = filter.accountId;
  if (filter.tag) where.tags = { some: { slug: filter.tag } };

  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) where.date.gte = new Date(filter.from);
    // `to` es inclusivo para el usuario: se suma un día y se compara con lt.
    if (filter.to) {
      const end = new Date(filter.to);
      end.setUTCDate(end.getUTCDate() + 1);
      where.date.lt = end;
    }
  }

  if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
    where.amount = {};
    if (filter.minAmount !== undefined) where.amount.gte = filter.minAmount;
    if (filter.maxAmount !== undefined) where.amount.lte = filter.maxAmount;
  }

  if (filter.q) {
    where.OR = [
      { description: { contains: filter.q, mode: "insensitive" } },
      { note: { contains: filter.q, mode: "insensitive" } },
      { merchantKey: { contains: filter.q, mode: "insensitive" } },
      { category: { name: { contains: filter.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export function parseFilterParams(params: Record<string, string | undefined>): TransactionFilter {
  return {
    q: params.q || undefined,
    kind: (params.kind as TransactionFilter["kind"]) || undefined,
    categoryId: params.categoryId || undefined,
    accountId: params.accountId || undefined,
    tag: params.tag || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    minAmount: params.minAmount ? Number(params.minAmount) : undefined,
    maxAmount: params.maxAmount ? Number(params.maxAmount) : undefined,
  };
}
