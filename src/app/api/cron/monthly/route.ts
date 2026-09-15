import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/modules/accounts/balance";
import { syncSubscriptions } from "@/modules/subscriptions/detect";

export const maxDuration = 60;

// Tarea mensual: deja fotografiado el saldo de cada cuenta (es lo que permite
// graficar la evolución del patrimonio) y refresca la detección de
// suscripciones.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  // Se ancla al primer día del mes para que el histórico quede parejo y el
  // unique de (accountId, date) evite duplicados si el cron corre dos veces.
  const snapshotDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const accounts = await getAccountsWithBalances();

  for (const account of accounts) {
    await prisma.accountBalanceSnapshot.upsert({
      where: { accountId_date: { accountId: account.id, date: snapshotDate } },
      create: { accountId: account.id, date: snapshotDate, balance: account.balance },
      update: { balance: account.balance },
    });
  }

  const subscriptions = await syncSubscriptions(now);

  return NextResponse.json({ snapshots: accounts.length, subscriptions });
}
