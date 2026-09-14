import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeNextDueDate, daysUntil } from "@/modules/fixed-payments/next-due-date";
import { formatDate } from "@/lib/utils";
import { sendPaymentReminderEmail } from "@/lib/email";
import { sendPushToAll } from "@/lib/push";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const daysBefore = Number(process.env.NOTIFY_DAYS_BEFORE ?? 3);
  const payments = await prisma.fixedPayment.findMany({ where: { active: true } });

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const due = payments.filter((p) => {
    const nextDue = computeNextDueDate(p, now);
    const days = daysUntil(nextDue, now);
    if (days > daysBefore || days < 0) return false;
    if (!p.lastNotifiedAt) return true;
    const lastNotified = new Date(
      Date.UTC(p.lastNotifiedAt.getUTCFullYear(), p.lastNotifiedAt.getUTCMonth(), p.lastNotifiedAt.getUTCDate())
    );
    return lastNotified.getTime() !== today.getTime();
  });

  if (due.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  const admin = await prisma.user.findFirst();

  if (admin) {
    await sendPaymentReminderEmail({
      to: admin.email,
      payments: due.map((p) => ({
        name: p.name,
        amount: p.amount.toString(),
        dueDate: formatDate(computeNextDueDate(p, now)),
      })),
    });
  }

  await sendPushToAll({
    title: "Pagos próximos a vencer",
    body: due.map((p) => p.name).join(", "),
  });

  await prisma.fixedPayment.updateMany({
    where: { id: { in: due.map((p) => p.id) } },
    data: { lastNotifiedAt: now },
  });

  return NextResponse.json({ notified: due.length });
}
