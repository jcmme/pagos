import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

// Los avisos van al dueño del pago, no a todos los dispositivos registrados:
// con dos personas usando la app, un push sin filtrar le manda a una los
// recordatorios de la otra.
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string }
) {
  ensureConfigured();
  if (!configured) return { skipped: true };

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return { sent: 0 };

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      )
    )
  );

  // Una suscripción que responde 404 o 410 es de un navegador que ya la
  // revocó: guardarla solo hace más lento el siguiente envío.
  const expired = subscriptions.filter((_, i) => {
    const result = results[i];
    return (
      result.status === "rejected" &&
      [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0)
    );
  });

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expired.map((s) => s.id) } },
    });
  }

  return { sent: results.filter((r) => r.status === "fulfilled").length };
}
