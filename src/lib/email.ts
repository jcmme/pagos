import { Resend } from "resend";
import { formatCurrency } from "@/lib/utils";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPaymentReminderEmail(params: {
  to: string;
  payments: { name: string; amount: string; dueDate: string }[];
}) {
  if (!resend) return { skipped: true };

  const rows = params.payments
    .map(
      (p) =>
        `<tr><td style="padding:6px 0">${p.name}</td><td style="padding:6px 0;text-align:right">${formatCurrency(p.amount)}</td><td style="padding:6px 0;text-align:right;color:#a1a1a6">${p.dueDate}</td></tr>`
    )
    .join("");

  return resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Pagos <onboarding@resend.dev>",
    to: params.to,
    subject: "Tienes pagos próximos a vencer",
    html: `
      <div style="font-family:sans-serif;background:#000;color:#f5f5f7;padding:24px;border-radius:16px">
        <h2 style="margin:0 0 12px">Pagos próximos</h2>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
    `,
  });
}
