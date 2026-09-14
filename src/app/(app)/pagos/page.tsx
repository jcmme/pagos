import { prisma } from "@/lib/prisma";
import { FixedPaymentsClient } from "./FixedPaymentsClient";

export const dynamic = "force-dynamic";

export default async function PagosPage() {
  const [payments, categories] = await Promise.all([
    prisma.fixedPayment.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-[26px] font-semibold">Pagos fijos</h1>
      <FixedPaymentsClient
        payments={JSON.parse(JSON.stringify(payments))}
        categories={categories}
      />
    </div>
  );
}
