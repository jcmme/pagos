/**
 * Simulacro de desastre: comprueba que del respaldo se puede volver.
 *
 * Un respaldo que nunca se ha restaurado es una promesa, no una garantía. Este
 * script la convierte en un hecho comprobable: fotografía la base, la vacía por
 * completo, la levanta desde el archivo de respaldo y compara las dos
 * fotografías. Si difieren en un solo campo, falla y dice en cuál.
 *
 * Se corre a mano cuando se toca algo del respaldo:
 *
 *     npx tsx --env-file=.env scripts/backup-drill.ts
 *
 * BORRA LA BASE A LA QUE APUNTE. Por eso se niega a correr contra cualquier
 * cosa que no sea localhost: el daño de equivocarse aquí es irreparable, y una
 * variable de entorno mal puesta no puede ser lo único que lo impida.
 */
import { prisma } from "../src/lib/prisma";
import { buildBackup } from "../src/modules/backup/export";
import { parseBackup, restoreBackup } from "../src/modules/backup/restore";
import { seedCategories } from "../src/lib/seed-categories";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();

if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(
    `\n✗ Este script BORRA la base y solo puede correr contra localhost.\n` +
      `  DATABASE_URL apunta a "${host || "(ilegible)"}".\n`
  );
  process.exit(1);
}

/**
 * Fotografía comparable de todo lo que tiene una persona. Los montos salen como
 * texto y las fechas como ISO para que la comparación sea exacta: si un centavo
 * cambiara de representación al pasar por el respaldo, aquí se nota.
 */
async function snapshot(userId: string) {
  const [user, accounts, transactions, fixed, debts, budgets, goals, incomes, subs] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, name: true, incomeMode: true, monthlyIncome: true },
      }),
      prisma.account.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        // Por nombre y no por id, por lo mismo que las categorías: restaurar
        // sobre una base que ya tiene la etiqueta reusa la que está, así que el
        // id cambia y el dato no.
        include: { tags: { select: { name: true }, orderBy: { name: "asc" } } },
      }),
      prisma.fixedPayment.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.debt.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        include: { payments: { orderBy: { id: "asc" } } },
      }),
      prisma.budget.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.savingsGoal.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        include: { contributions: { orderBy: { id: "asc" } } },
      }),
      prisma.monthlyIncome.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.subscription.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    ]);

  // Una categoría se compara por su nombre completo y no por su id.
  //
  // Restaurar sobre una base resembrada reusa a propósito la categoría que ya
  // está —"Comida" es "Comida" aunque su fila sea otra— y le apunta todo lo del
  // archivo. El id cambia y el dato no. Comparar ids marcaría como pérdida lo
  // que en realidad es el comportamiento correcto; comparar la ruta comprueba
  // lo que de verdad importa: que el movimiento siga en su categoría.
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const nameById = new Map(categories.map((c) => [c.id, c]));
  const path = (id: string | null): string | null => {
    if (id === null) return null;
    const parts: string[] = [];
    let cursor = nameById.get(id);
    while (cursor && parts.length < 10) {
      parts.unshift(cursor.name);
      cursor = cursor.parentId ? nameById.get(cursor.parentId) : undefined;
    }
    return parts.length ? parts.join(" › ") : `(id perdido: ${id})`;
  };

  // createdAt/updatedAt no se respaldan: son metadatos de la fila —cuándo se
  // escribió—, no del dato. Al restaurar son necesariamente nuevos, así que
  // compararlos haría fallar el simulacro siempre y por algo que a nadie le
  // importa. Se quitan en profundidad: los pagos de una deuda y las
  // aportaciones a una meta también los traen.
  const strip = (value: unknown): unknown => {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(strip);
    if (value !== null && typeof value === "object") {
      // Las cantidades son Decimal, que no es un objeto plano: se compara su
      // texto, que es justo la representación que viaja en el respaldo.
      if (typeof (value as { toFixed?: unknown }).toFixed === "function") {
        return String(value);
      }
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => key !== "createdAt" && key !== "updatedAt")
          .map(([key, inner]) => [
            key,
            key === "categoryId" ? path(inner as string | null) : strip(inner),
          ])
      );
    }
    return value;
  };

  return JSON.stringify(
    strip({ user, accounts, transactions, fixed, debts, budgets, goals, incomes, subs }),
    null,
    2
  );
}

async function main() {
  const user = await prisma.user.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  console.log(`Simulacro sobre ${user.email} (base local)\n`);

  const before = await snapshot(user.id);
  const counts = JSON.parse(before);
  console.log(
    `  Antes:      ${counts.transactions.length} movimientos, ` +
      `${counts.accounts.length} cuentas, ${counts.debts.length} deudas, ` +
      `${counts.budgets.length} presupuestos, ${counts.goals.length} metas`
  );

  // 1. Respaldar, y pasar por texto como pasaría de verdad: el archivo se baja,
  //    se guarda y se vuelve a subir. Si algo no sobrevive a JSON, falla aquí.
  const file = JSON.stringify(await buildBackup(user.id), null, 2);
  console.log(`  Respaldo:   ${(file.length / 1024).toFixed(1)} KB`);

  // 2. El desastre.
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.goalContribution.deleteMany({ where: { goal: { userId: user.id } } });
  await prisma.savingsGoal.deleteMany({ where: { userId: user.id } });
  await prisma.debtPayment.deleteMany({ where: { debt: { userId: user.id } } });
  await prisma.debt.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.subscription.deleteMany({ where: { userId: user.id } });
  await prisma.fixedPayment.deleteMany({ where: { userId: user.id } });
  await prisma.monthlyIncome.deleteMany({ where: { userId: user.id } });
  await prisma.statementImport.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  await prisma.category.deleteMany({});
  await prisma.tag.deleteMany({});

  const empty = JSON.parse(await snapshot(user.id));
  if (empty.transactions.length !== 0 || empty.accounts.length !== 0) {
    throw new Error("El borrado no dejó la base vacía; el simulacro no probaría nada.");
  }

  // Reconstruir como se reconstruiría de verdad: quien pierde la base corre las
  // migraciones y el seed, y hasta ahí llega antes de restaurar. Eso deja las
  // categorías por defecto puestas, con ids nuevos y los mismos nombres que
  // trae el archivo.
  //
  // Esto no estaba en la primera versión del simulacro —restauraba sobre una
  // base pelada— y por eso no vio que el nombre de una categoría es único por
  // nivel: restaurar sobre una base recién sembrada reventaba contra
  // `Category_root_name_key`, que es exactamente el único escenario en el que
  // alguien restaura.
  await seedCategories(prisma);

  // Y una etiqueta que choca por slug con una del archivo, si el archivo trae
  // etiquetas. Un `slug` es único en toda la instancia, así que basta con que
  // otra persona —o un seed— haya creado "viaje" para que el respaldo traiga
  // una etiqueta que no se puede insertar por id.
  //
  // Esto tampoco estaba: el archivo del simulacro tenía etiquetas pero la base
  // de destino quedaba sin ninguna, así que el choque nunca se daba. Ese hueco
  // escondió que el camino del choque avisaba "se reusó" sin guardar el mapeo,
  // y el enlace posterior pedía una etiqueta inexistente y tumbaba la
  // transacción entera. Una etiqueta repetida bastaba para no poder restaurar.
  const conEtiquetas = JSON.parse(file).tags as { name: string; slug: string }[];
  if (conEtiquetas.length > 0) {
    await prisma.tag.create({
      data: { name: conEtiquetas[0].name, slug: conEtiquetas[0].slug },
    });
  }

  const sembrada = await prisma.category.count();
  console.log(
    `  Desastre:   base vacía, resembrada con ${sembrada} categorías por defecto` +
      (conEtiquetas.length > 0 ? ` y la etiqueta "${conEtiquetas[0].name}" ya ocupada` : "")
  );

  // 3. Volver desde el archivo, validándolo como si lo hubiera subido alguien.
  const report = await restoreBackup(user.id, parseBackup(JSON.parse(file)));
  console.log(`  Restaurado: ${report.restored.movimientos} movimientos`);
  for (const warning of report.warnings) console.log(`    aviso: ${warning}`);

  // 4. El veredicto.
  const after = await snapshot(user.id);
  if (after === before) {
    console.log(`\n✓ La base volvió idéntica, campo por campo.\n`);
    return;
  }

  const a = before.split("\n");
  const b = after.split("\n");
  console.error(`\n✗ La base NO volvió igual. Primeras diferencias:\n`);
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 10; i++) {
    if (a[i] !== b[i]) {
      console.error(`  línea ${i + 1}\n    antes:   ${a[i]}\n    después: ${b[i]}`);
      shown++;
    }
  }
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
