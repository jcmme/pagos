// Sonda temporal para reproducir el 500 de producción ejecutando directamente
// las consultas que hacen /, /movimientos y /salud.
import { getHealthReport } from "../src/lib/metrics";
import { getAvailableToSpend } from "../src/lib/metrics/available";
import { generateInsights } from "../src/modules/insights/generate";
import { buildTransactionWhere, parseFilterParams } from "../src/modules/transactions/query";
import { prisma } from "../src/lib/prisma";

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    console.log(`OK   ${name}`, JSON.stringify(result).slice(0, 200));
  } catch (error) {
    console.log(`FALLA ${name}`);
    console.error(error);
  }
}

async function main() {
  await step("groupBy kind (sin filtro)", () =>
    prisma.transaction.groupBy({ by: ["kind"], where: {}, _sum: { amount: true } })
  );

  await step("findMany movimientos (sin filtro)", async () => {
    const where = buildTransactionWhere(parseFilterParams({}));
    const rows = await prisma.transaction.findMany({
      where,
      include: { category: { include: { parent: true } }, account: true, tags: true },
      orderBy: { date: "desc" },
      take: 150,
    });
    return { filas: rows.length };
  });

  await step("getHealthReport", () => getHealthReport());
  await step("getAvailableToSpend", () => getAvailableToSpend());
  await step("generateInsights", () => generateInsights());

  await prisma.$disconnect();
}

main();
