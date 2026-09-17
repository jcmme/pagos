import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serialize } from "@/lib/utils";
import { SubscriptionsClient } from "./SubscriptionsClient";

export const dynamic = "force-dynamic";

export default async function SuscripcionesPage() {
  const userId = await requireUserId();
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { lastAmount: "desc" }],
  });

  return <SubscriptionsClient subscriptions={serialize(subscriptions)} />;
}
