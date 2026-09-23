import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  last4: string | null;
  color: string;
  liquid: boolean;
  includeInNetWorth: boolean;
  archived: boolean;
  creditLimit: number | null;
  cutoffDay: number | null;
  paymentDueDay: number | null;
  initialBalance: number;
  balance: number;
};

// El saldo nunca se guarda en la tabla: se deriva de initialBalance más los
// movimientos. Así no puede desincronizarse si se edita o borra un movimiento.
//
// Va envuelta en `cache()` porque el Resumen la pedía TRES veces por carga —la
// página, el reporte de salud y el disponible para gastar— y cada una son tres
// consultas. `cache()` deduplica dentro de la misma petición: la primera
// llamada consulta y las otras dos reciben el mismo resultado sin tocar la
// base. Seis consultas menos por pantalla, y ninguna línea de lógica movida.
export const getAccountsWithBalances = cache(async function getAccountsWithBalances(
  userId: string
): Promise<AccountWithBalance[]> {
  const [accounts, byAccount, transfersIn] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      orderBy: [{ archived: "asc" }, { name: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "kind"],
      where: { userId, accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["transferAccountId"],
      where: { userId, kind: "TRANSFER", transferAccountId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const deltas = new Map<string, number>();

  for (const row of byAccount) {
    if (!row.accountId) continue;
    const amount = toNumber(row._sum.amount ?? 0);
    // Un gasto y la salida de una transferencia restan; un ingreso suma.
    const signed = row.kind === "INCOME" ? amount : -amount;
    deltas.set(row.accountId, (deltas.get(row.accountId) ?? 0) + signed);
  }

  for (const row of transfersIn) {
    if (!row.transferAccountId) continue;
    const amount = toNumber(row._sum.amount ?? 0);
    deltas.set(row.transferAccountId, (deltas.get(row.transferAccountId) ?? 0) + amount);
  }

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    institution: account.institution,
    last4: account.last4,
    color: account.color,
    liquid: account.liquid,
    includeInNetWorth: account.includeInNetWorth,
    archived: account.archived,
    creditLimit: account.creditLimit ? toNumber(account.creditLimit) : null,
    cutoffDay: account.cutoffDay,
    paymentDueDay: account.paymentDueDay,
    initialBalance: toNumber(account.initialBalance),
    balance: toNumber(account.initialBalance) + (deltas.get(account.id) ?? 0),
  }));
});

export function liquidBalance(accounts: AccountWithBalance[]): number {
  return accounts
    .filter((account) => account.liquid && !account.archived)
    .reduce((sum, account) => sum + account.balance, 0);
}
