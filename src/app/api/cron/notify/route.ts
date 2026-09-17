import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeNextDueDate } from "@/modules/fixed-payments/next-due-date";
import { notifyOffsets, nextMonthlyDate, offsetDueToday } from "@/modules/reminders/schedule";
import { formatCurrency, formatDate } from "@/lib/utils";
import { sendPaymentReminderEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

type Pending = {
  kind: "FIXED_PAYMENT" | "CARD_PAYMENT";
  refId: string;
  name: string;
  amount: string;
  dueDate: Date;
  daysBefore: number;
};

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  // Sin secreto configurado el endpoint quedaba abierto a cualquiera. Ahora
  // falta el secreto es un error de configuración, no una puerta sin llave.
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET no está configurado" },
      { status: 500 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const offsets = notifyOffsets();

  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, email: true },
  });

  let notified = 0;

  for (const user of users) {
    const [payments, cards] = await Promise.all([
      // Solo se avisa de lo que hay que pagar; los ingresos fijos (el sueldo)
      // existen para el cálculo de "disponible", no para recordatorios.
      prisma.fixedPayment.findMany({
        where: { userId: user.id, active: true, kind: "EXPENSE" },
      }),
      prisma.account.findMany({
        where: {
          userId: user.id,
          type: "CREDIT_CARD",
          archived: false,
          paymentDueDay: { not: null },
        },
      }),
    ]);

    const pending: Pending[] = [];

    for (const payment of payments) {
      const dueDate = computeNextDueDate(payment, now);
      const daysBefore = offsetDueToday(dueDate, offsets, now);
      if (daysBefore === null) continue;
      pending.push({
        kind: "FIXED_PAYMENT",
        refId: payment.id,
        name: payment.name,
        amount: payment.amount.toString(),
        dueDate,
        daysBefore,
      });
    }

    for (const card of cards) {
      const dueDate = nextMonthlyDate(card.paymentDueDay!, now);
      const daysBefore = offsetDueToday(dueDate, offsets, now);
      if (daysBefore === null) continue;
      pending.push({
        kind: "CARD_PAYMENT",
        refId: card.id,
        name: `Pago de ${card.name}`,
        // La tarjeta no tiene un monto fijo por adelantado: lo que se debe
        // depende del corte, así que el aviso solo lleva la fecha.
        amount: "",
        dueDate,
        daysBefore,
      });
    }

    if (pending.length === 0) continue;

    // Registrar el aviso antes de enviarlo: si el cron corre dos veces, el
    // unique descarta los repetidos y solo se manda lo que de verdad es nuevo.
    const fresh: Pending[] = [];
    for (const item of pending) {
      try {
        await prisma.reminderSent.create({
          data: {
            userId: user.id,
            kind: item.kind,
            refId: item.refId,
            dueDate: item.dueDate,
            daysBefore: item.daysBefore,
          },
        });
        fresh.push(item);
      } catch (error) {
        // P2002 = ya se había avisado de esto. Cualquier otro error sí importa.
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
      }
    }

    if (fresh.length === 0) continue;

    await sendPaymentReminderEmail({
      to: user.email,
      payments: fresh.map((item) => ({
        name: item.name,
        amount: item.amount,
        dueDate: formatDate(item.dueDate),
      })),
    });

    await sendPushToUser(user.id, {
      title: fresh.length === 1 ? fresh[0].name : "Pagos próximos a vencer",
      body: fresh
        .map((item) => {
          const cuando = item.daysBefore === 1 ? "mañana" : `en ${item.daysBefore} días`;
          const monto = item.amount ? ` · ${formatCurrency(Number(item.amount))}` : "";
          return `${item.name}: ${cuando}${monto}`;
        })
        .join("\n"),
    });

    notified += fresh.length;
  }

  return NextResponse.json({ users: users.length, notified, offsets });
}
