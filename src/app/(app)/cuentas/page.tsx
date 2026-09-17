import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toNumber } from "@/lib/utils";
import { getAccountsWithBalances } from "@/modules/accounts/balance";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const userId = await requireUserId();
  const [accounts, debts] = await Promise.all([
    getAccountsWithBalances(userId),
    prisma.debt.findMany({
      where: { userId, type: "OWE" },
      include: { payments: true },
    }),
  ]);

  const outstandingDebt = debts.reduce((sum, debt) => {
    const paid = debt.payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
    return sum + Math.max(0, toNumber(debt.totalAmount) - paid);
  }, 0);

  const assets = accounts
    .filter((account) => account.includeInNetWorth && !account.archived && account.balance > 0)
    .reduce((sum, account) => sum + account.balance, 0);

  const negativeBalances = accounts
    .filter((account) => account.includeInNetWorth && !account.archived && account.balance < 0)
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);

  return (
    <AccountsClient
      accounts={accounts}
      netWorth={{
        assets,
        liabilities: outstandingDebt + negativeBalances,
        total: assets - outstandingDebt - negativeBalances,
      }}
    />
  );
}
