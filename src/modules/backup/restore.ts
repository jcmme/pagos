import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BACKUP_FORMAT_VERSION } from "@/modules/backup/export";

// Un respaldo entra como archivo que la persona escoge del disco: puede estar
// truncado, ser de otra app o venir de una versión futura del formato. Nada de
// lo que traiga se toca sin pasar por aquí, porque restaurar borra antes de
// escribir y un archivo malo a media restauración es justo el desastre que
// esto viene a evitar.
const money = z.string().regex(/^-?\d+(\.\d+)?$/, "monto inválido");
const date = z.string().datetime();

const backupSchema = z.object({
  formatVersion: z.number().int().positive(),
  generatedAt: z.string(),
  user: z.object({
    email: z.email(),
    name: z.string().nullable(),
    incomeMode: z.enum(["FIJO", "VARIABLE"]),
    monthlyIncome: money.nullable(),
  }),
  monthlyIncomes: z.array(
    z.object({
      id: z.string(),
      month: z.number().int(),
      year: z.number().int(),
      amount: money,
    })
  ),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      icon: z.string().nullable(),
      parentId: z.string().nullable(),
      essential: z.boolean(),
      savings: z.boolean(),
      archived: z.boolean(),
      sortOrder: z.number().int(),
    })
  ),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      color: z.string(),
    })
  ),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT", "LOAN"]),
      institution: z.string().nullable(),
      last4: z.string().nullable(),
      initialBalance: money,
      creditLimit: money.nullable(),
      cutoffDay: z.number().int().nullable(),
      paymentDueDay: z.number().int().nullable(),
      includeInNetWorth: z.boolean(),
      liquid: z.boolean(),
      archived: z.boolean(),
      color: z.string(),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
      amount: money,
      date: date,
      description: z.string().nullable(),
      note: z.string().nullable(),
      merchantKey: z.string().nullable(),
      source: z.enum(["MANUAL", "IMPORTED", "RECURRING"]),
      categoryId: z.string().nullable(),
      accountId: z.string().nullable(),
      transferAccountId: z.string().nullable(),
      excludeFromStats: z.boolean(),
      externalId: z.string().nullable(),
      dedupeHash: z.string().nullable(),
      tagIds: z.array(z.string()),
    })
  ),
  fixedPayments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      amount: money,
      kind: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
      dueDay: z.number().int(),
      dueMonth: z.number().int().nullable(),
      frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]),
      active: z.boolean(),
      categoryId: z.string().nullable(),
      accountId: z.string().nullable(),
      lastPaidAt: date.nullable(),
    })
  ),
  debts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      counterparty: z.string().nullable(),
      type: z.enum(["OWE", "OWED"]),
      totalAmount: money,
      interestRate: money.nullable(),
      startDate: date,
      note: z.string().nullable(),
      payments: z.array(
        z.object({
          id: z.string(),
          amount: money,
          date: date,
          note: z.string().nullable(),
        })
      ),
    })
  ),
  budgets: z.array(
    z.object({
      id: z.string(),
      categoryId: z.string(),
      amount: money.nullable(),
      percent: money.nullable(),
      adjustment: money,
      month: z.number().int(),
      year: z.number().int(),
    })
  ),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      targetAmount: money,
      targetDate: date.nullable(),
      accountId: z.string().nullable(),
      color: z.string(),
      archived: z.boolean(),
      contributions: z.array(
        z.object({
          id: z.string(),
          amount: money,
          date: date,
          note: z.string().nullable(),
        })
      ),
    })
  ),
  categoryRules: z.array(
    z.object({
      id: z.string(),
      pattern: z.string(),
      matchType: z.enum(["CONTAINS", "STARTS_WITH", "EXACT", "REGEX"]),
      categoryId: z.string(),
      priority: z.number().int(),
      active: z.boolean(),
      learned: z.boolean(),
      hitCount: z.number().int(),
    })
  ),
  subscriptions: z.array(
    z.object({
      id: z.string(),
      merchantKey: z.string(),
      label: z.string(),
      lastAmount: money,
      previousAmount: money.nullable(),
      cadenceDays: z.number().int(),
      occurrences: z.number().int(),
      lastChargeAt: date,
      status: z.enum(["DETECTED", "CONFIRMED", "DISMISSED"]),
      fixedPaymentId: z.string().nullable(),
    })
  ),
});

export type ParsedBackup = z.infer<typeof backupSchema>;

export type RestoreReport = {
  restored: Record<string, number>;
  warnings: string[];
};

/**
 * Lee y valida un archivo de respaldo sin tocar la base. Se llama antes de
 * restaurar para poder decirle a la persona qué trae el archivo y rechazarlo
 * si no sirve, en vez de descubrirlo con la base ya vacía.
 */
export function parseBackup(raw: unknown): ParsedBackup {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(
      `El archivo no parece un respaldo de Pagos: ${first.path.join(".")} ${first.message}`
    );
  }

  if (parsed.data.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `El respaldo es de un formato más nuevo (v${parsed.data.formatVersion}) que esta versión de la app (v${BACKUP_FORMAT_VERSION}). Actualiza la app antes de restaurar.`
    );
  }

  return parsed.data;
}

// Las categorías se referencian entre sí (una subcategoría apunta a su madre),
// así que no se pueden insertar en cualquier orden: la madre tiene que existir
// antes que la hija. Se ordenan por profundidad en vez de confiar en el orden
// del archivo.
function byDepth(categories: ParsedBackup["categories"]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const depth = (c: ParsedBackup["categories"][number]): number => {
    let d = 0;
    let cursor = c.parentId ? byId.get(c.parentId) : undefined;
    // El tope corta un ciclo si el archivo viniera corrupto, en vez de colgarse.
    while (cursor && d < 10) {
      d++;
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return d;
  };
  return [...categories].sort((a, b) => depth(a) - depth(b));
}

/**
 * Restaura un respaldo sobre la cuenta indicada.
 *
 * **Reemplaza, no mezcla.** Todo lo que esa persona tenga se borra y se vuelve
 * a escribir desde el archivo. Es lo correcto para lo que existe esto —volver
 * al estado del respaldo tras un desastre— y sería un error usarlo para
 * "juntar" dos bases: los ids del archivo son los de origen, así que mezclar
 * produciría duplicados silenciosos.
 *
 * Todo ocurre dentro de una transacción: si algo falla a la mitad, la base se
 * queda como estaba. Nunca existe un punto en el que los datos estén borrados
 * y la restauración incompleta.
 */
export async function restoreBackup(
  userId: string,
  backup: ParsedBackup
): Promise<RestoreReport> {
  const warnings: string[] = [];

  // Los catálogos compartidos (categorías, etiquetas, reglas) no se borran:
  // pertenecen a la instancia entera y otra persona puede estar usándolos.
  // Se insertan los que falten y se dejan en paz los que ya están.
  const restored = await prisma.$transaction(
    async (tx) => {
      // ── Borrado, en orden de dependencia ──────────────────────────────
      // Los movimientos primero: sueltan las etiquetas y dejan de apuntar a
      // cuentas, que es lo que permite borrar las cuentas después.
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.goalContribution.deleteMany({ where: { goal: { userId } } });
      await tx.savingsGoal.deleteMany({ where: { userId } });
      await tx.debtPayment.deleteMany({ where: { debt: { userId } } });
      await tx.debt.deleteMany({ where: { userId } });
      await tx.budget.deleteMany({ where: { userId } });
      // Las suscripciones antes que los pagos fijos: una suscripción confirmada
      // apunta a su pago fijo con una llave única.
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.fixedPayment.deleteMany({ where: { userId } });
      await tx.monthlyIncome.deleteMany({ where: { userId } });
      // Las importaciones apuntan a cuentas; se van con su bandeja para que las
      // cuentas puedan borrarse.
      await tx.statementImport.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });

      // ── Escritura ─────────────────────────────────────────────────────
      await tx.user.update({
        where: { id: userId },
        data: {
          name: backup.user.name,
          incomeMode: backup.user.incomeMode,
          monthlyIncome: backup.user.monthlyIncome,
        },
      });

      // El nombre de una categoría es único por nivel, y no por un `@@unique`
      // del esquema sino por dos índices parciales en SQL crudo
      // (`Category_root_name_key` y `Category_child_name_key`), porque Postgres
      // considera distintos entre sí los NULL.
      //
      // Eso importa justo en el caso para el que existe restaurar: sobre una
      // base recién levantada, que ya trae las categorías por defecto del seed
      // con OTROS ids. Insertarlas por id chocaría contra ese índice y tumbaría
      // la restauración entera. Cuando el nombre ya está tomado se reusa la
      // categoría que hay y se apunta todo lo del archivo hacia ella.
      const categoryMap = new Map<string, string>();
      const resolveCategory = (id: string | null) =>
        id === null ? null : (categoryMap.get(id) ?? id);

      for (const category of byDepth(backup.categories)) {
        // La madre se resuelve primero: si la madre se reusó, la hija tiene que
        // colgarse de la que de verdad quedó, no de la del archivo.
        const parentId = resolveCategory(category.parentId);

        const sameName = await tx.category.findFirst({
          where: { name: category.name, parentId },
        });

        if (sameName && sameName.id !== category.id) {
          categoryMap.set(category.id, sameName.id);
          warnings.push(`La categoría "${category.name}" ya existía; se reusó.`);
          continue;
        }

        await tx.category.upsert({
          where: { id: category.id },
          create: { ...category, parentId },
          update: { ...category, parentId },
        });
        categoryMap.set(category.id, category.id);
      }

      // Mismo problema que las categorías y misma solución: el `slug` de una
      // etiqueta es único en toda la instancia, así que sobre una base que ya
      // tiene "viaje" el upsert por id chocaría. Se reusa la que está.
      //
      // El mapeo es obligatorio, no un adorno: sin él, el enlace de más abajo
      // pediría la etiqueta por el id del archivo —que no se creó— y Prisma
      // tumbaría la transacción entera con un P2025. O sea, una sola etiqueta
      // repetida bastaba para que no se pudiera restaurar nada.
      const tagMap = new Map<string, string>();

      for (const tag of backup.tags) {
        const clash = await tx.tag.findFirst({
          where: { slug: tag.slug, id: { not: tag.id } },
        });
        if (clash) {
          tagMap.set(tag.id, clash.id);
          warnings.push(`La etiqueta "${tag.name}" ya existía; se reusó.`);
          continue;
        }
        await tx.tag.upsert({ where: { id: tag.id }, create: tag, update: tag });
        tagMap.set(tag.id, tag.id);
      }

      await tx.account.createMany({ data: backup.accounts.map((a) => ({ ...a, userId })) });

      await tx.monthlyIncome.createMany({
        data: backup.monthlyIncomes.map((i) => ({ ...i, userId })),
      });

      // Las columnas se escriben una por una y no con `...row`: `tagIds` no es
      // una columna sino la relación, y enumerarlas hace que añadir un campo al
      // respaldo sin añadirlo aquí lo marque el compilador en vez de perderse.
      await tx.transaction.createMany({
        data: backup.transactions.map((row) => ({
          userId,
          id: row.id,
          kind: row.kind,
          amount: row.amount,
          date: row.date,
          description: row.description,
          note: row.note,
          merchantKey: row.merchantKey,
          source: row.source,
          categoryId: resolveCategory(row.categoryId),
          accountId: row.accountId,
          transferAccountId: row.transferAccountId,
          excludeFromStats: row.excludeFromStats,
          externalId: row.externalId,
          dedupeHash: row.dedupeHash,
        })),
      });

      // Las etiquetas se enlazan agrupando por etiqueta y no por movimiento:
      // son pocas, así que son un puñado de consultas en vez de una por cada
      // movimiento etiquetado.
      const byTag = new Map<string, string[]>();
      for (const transaction of backup.transactions) {
        for (const tagId of transaction.tagIds) {
          // Por la etiqueta que de verdad quedó, no por la del archivo.
          const real = tagMap.get(tagId);
          if (!real) continue;
          byTag.set(real, [...(byTag.get(real) ?? []), transaction.id]);
        }
      }
      for (const [tagId, transactionIds] of byTag) {
        await tx.tag.update({
          where: { id: tagId },
          data: { transactions: { connect: transactionIds.map((id) => ({ id })) } },
        });
      }

      await tx.fixedPayment.createMany({
        data: backup.fixedPayments.map((p) => ({
          ...p,
          userId,
          categoryId: resolveCategory(p.categoryId),
        })),
      });

      await tx.debt.createMany({
        data: backup.debts.map((debt) => ({
          userId,
          id: debt.id,
          name: debt.name,
          counterparty: debt.counterparty,
          type: debt.type,
          totalAmount: debt.totalAmount,
          interestRate: debt.interestRate,
          startDate: debt.startDate,
          note: debt.note,
        })),
      });
      await tx.debtPayment.createMany({
        data: backup.debts.flatMap((debt) =>
          debt.payments.map((payment) => ({ ...payment, debtId: debt.id }))
        ),
      });

      await tx.budget.createMany({
        data: backup.budgets.map((b) => ({
          ...b,
          userId,
          categoryId: resolveCategory(b.categoryId)!,
        })),
      });

      await tx.savingsGoal.createMany({
        data: backup.goals.map((goal) => ({
          userId,
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate,
          accountId: goal.accountId,
          color: goal.color,
          archived: goal.archived,
        })),
      });
      await tx.goalContribution.createMany({
        data: backup.goals.flatMap((goal) =>
          goal.contributions.map((contribution) => ({ ...contribution, goalId: goal.id }))
        ),
      });

      for (const rule of backup.categoryRules) {
        // El unique es (pattern, matchType): si ya existe una regla igual la de
        // otra persona gana y esta se salta, porque son el mismo criterio.
        const clash = await tx.categoryRule.findFirst({
          where: { pattern: rule.pattern, matchType: rule.matchType, id: { not: rule.id } },
        });
        if (clash) continue;
        const ruleRow = { ...rule, categoryId: resolveCategory(rule.categoryId)! };
        await tx.categoryRule.upsert({
          where: { id: rule.id },
          create: ruleRow,
          update: ruleRow,
        });
      }

      await tx.subscription.createMany({
        data: backup.subscriptions.map((s) => ({ ...s, userId })),
      });

      return {
        movimientos: backup.transactions.length,
        cuentas: backup.accounts.length,
        pagosFijos: backup.fixedPayments.length,
        presupuestos: backup.budgets.length,
        deudas: backup.debts.length,
        pagosDeDeuda: backup.debts.reduce((n, d) => n + d.payments.length, 0),
        metas: backup.goals.length,
        aportacionesAMetas: backup.goals.reduce((n, g) => n + g.contributions.length, 0),
        categorias: backup.categories.length,
        etiquetas: backup.tags.length,
        reglas: backup.categoryRules.length,
        suscripciones: backup.subscriptions.length,
        ingresosMensuales: backup.monthlyIncomes.length,
      };
    },
    {
      // Una restauración con años de movimientos no cabe en los 5s que Prisma
      // da por defecto, y quedarse a medias aquí no es una opción.
      timeout: 120_000,
      maxWait: 20_000,
    }
  );

  return { restored, warnings };
}
