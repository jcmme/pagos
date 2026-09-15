import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";
import { SubscriptionsClient } from "./SubscriptionsClient";

export const dynamic = "force-dynamic";

export default async function SuscripcionesPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ status: "asc" }, { lastAmount: "desc" }],
  });

  return <SubscriptionsClient subscriptions={serialize(subscriptions)} />;
}
