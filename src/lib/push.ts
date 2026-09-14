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

export async function sendPushToAll(payload: { title: string; body: string }) {
  ensureConfigured();
  if (!configured) return { skipped: true };

  const subscriptions = await prisma.pushSubscription.findMany();
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

  const expired = subscriptions.filter((_, i) => {
    const result = results[i];
    return result.status === "rejected" && [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0);
  });

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expired.map((s) => s.id) } },
    });
  }

  return { sent: results.filter((r) => r.status === "fulfilled").length };
}
