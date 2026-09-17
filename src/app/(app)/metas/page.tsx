import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serialize } from "@/lib/utils";
import { monthsUntil } from "@/modules/goals/schedule";
import { GoalsClient } from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const userId = await requireUserId();
  const [goals, accounts] = await Promise.all([
    prisma.savingsGoal.findMany({
      where: { userId, archived: false },
      include: { contributions: { orderBy: { date: "desc" } }, account: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId, archived: false },
      orderBy: { name: "asc" },
    }),
  ]);

  // El cálculo de "cuánto apartar al mes" depende de la fecha de hoy, así que
  // se resuelve aquí en el servidor y no durante el render del cliente.
  const monthsRemaining = Object.fromEntries(
    goals.map((goal) => [goal.id, monthsUntil(goal.targetDate)])
  );

  return (
    <GoalsClient
      goals={serialize(goals)}
      accounts={serialize(accounts)}
      monthsRemaining={monthsRemaining}
    />
  );
}
