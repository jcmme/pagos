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
  initialBalance: number;
  balance: number;
};

// El saldo nunca se guarda en la tabla: se deriva de initialBalance más los
// movimientos. Así no puede desincronizarse si se edita o borra un movimiento.
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const [accounts, byAccount, transfersIn] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ archived: "asc" }, { name: "asc" }] }),
    prisma.transaction.groupBy({
      by: ["accountId", "kind"],
      where: { accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["transferAccountId"],
      where: { kind: "TRANSFER", transferAccountId: { not: null } },
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
    initialBalance: toNumber(account.initialBalance),
    balance: toNumber(account.initialBalance) + (deltas.get(account.id) ?? 0),
  }));
}

export function liquidBalance(accounts: AccountWithBalance[]): number {
  return accounts
    .filter((account) => account.liquid && !account.archived)
    .reduce((sum, account) => sum + account.balance, 0);
}
