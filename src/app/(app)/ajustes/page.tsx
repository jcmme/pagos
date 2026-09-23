import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const userId = await requireUserId();

  const [
    me,
    users,
    movimientos,
    cuentas,
    pagosFijos,
    presupuestos,
    deudas,
    metas,
    categorias,
    reglas,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true },
      orderBy: { createdAt: "asc" },
    }),
    // Cuentas, no las filas: armar el respaldo completo solo para enseñar un
    // número traería todos los movimientos en cada visita a Ajustes.
    prisma.transaction.count({ where: { userId } }),
    prisma.account.count({ where: { userId } }),
    prisma.fixedPayment.count({ where: { userId } }),
    prisma.budget.count({ where: { userId } }),
    prisma.debt.count({ where: { userId } }),
    prisma.savingsGoal.count({ where: { userId } }),
    prisma.category.count(),
    prisma.categoryRule.count(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Ajustes</h1>
      <SettingsClient
        me={me}
        // La lista de usuarios solo se manda si quien mira es administrador:
        // filtrarla en el cliente igual la enviaría por la red.
        users={me.role === "ADMIN" ? users : []}
        backupCounts={{
          movimientos,
          cuentas,
          pagosFijos,
          presupuestos,
          deudas,
          metas,
          categorias,
          reglas,
        }}
      />
    </div>
  );
}
