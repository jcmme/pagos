import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { serialize } from "@/lib/utils";
import { FixedPaymentsClient } from "./FixedPaymentsClient";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const userId = await requireUserId();
  const [payments, categories, accounts] = await Promise.all([
    prisma.fixedPayment.findMany({
      where: { userId },
      include: {
        category: { include: { parent: { include: { parent: true } } } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { archived: false },
      include: { parent: { include: { parent: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    // Solo id y nombre: la fila completa trae Decimal, que no cruza la
    // frontera al componente cliente.
    prisma.account.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Pagos fijos</h1>
      <FixedPaymentsClient
        payments={serialize(payments).map((payment) => ({
          ...payment,
          // `kind` es TxKind en la base, pero un pago fijo solo puede ser gasto
          // o ingreso: una transferencia no se programa.
          kind: payment.kind === "INCOME" ? ("INCOME" as const) : ("EXPENSE" as const),
        }))}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
