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

/**
 * Manda el respaldo como archivo adjunto.
 *
 * El correo es el destino deliberado: un respaldo que se queda en el mismo
 * servidor que la base no es un respaldo, porque el accidente que borra una
 * cosa borra la otra. El buzón está en otra empresa, en otra infraestructura, y
 * ya tiene sus propias copias. Y llega solo, que es lo que separa un respaldo
 * de una buena intención.
 */
export async function sendBackupEmail(params: {
  to: string;
  filename: string;
  json: string;
  counts: Record<string, number>;
}) {
  if (!resend) return { skipped: true };

  const rows = Object.entries(params.counts)
    .filter(([, count]) => count > 0)
    .map(
      ([label, count]) =>
        `<tr><td style="padding:4px 0">${label}</td><td style="padding:4px 0;text-align:right">${count}</td></tr>`
    )
    .join("");

  return resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Pagos <onboarding@resend.dev>",
    to: params.to,
    subject: `Respaldo de Pagos — ${params.filename.replace(/\D*(\d{4}-\d{2}-\d{2}).*/, "$1")}`,
    html: `
      <div style="font-family:sans-serif;background:#000;color:#f5f5f7;padding:24px;border-radius:16px">
        <h2 style="margin:0 0 8px">Tu respaldo semanal</h2>
        <p style="margin:0 0 16px;color:#a1a1a6;font-size:14px">
          Guarda este archivo. Si algún día pierdes la base, con él se restaura
          todo desde Ajustes → Respaldo.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      </div>
    `,
    attachments: [
      {
        filename: params.filename,
        content: Buffer.from(params.json, "utf-8").toString("base64"),
      },
    ],
  });
}
