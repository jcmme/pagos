import { prisma } from "@/lib/prisma";

// La versión del formato, no la de la app. Solo sube cuando un respaldo viejo
// deja de poder leerse tal cual, para que quien restaure sepa de inmediato si
// el archivo que trae es compatible en vez de descubrirlo a la mitad.
export const BACKUP_FORMAT_VERSION = 1;

// El dinero viaja como texto, nunca como número.
//
// Los montos son Decimal(12,2) en la base y JSON no tiene decimales exactos:
// pasar por `number` convierte a punto flotante binario, donde 1234.55 no se
// puede representar. En un respaldo eso es inaceptable —es la copia de la que
// se reconstruye todo—, así que se serializa la representación decimal tal
// cual la guarda Postgres y se restaura desde ahí.
type Decimalish = { toString(): string } | null | undefined;

function money(value: Decimalish): string | null {
  return value === null || value === undefined ? null : value.toString();
}

function when(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export type Backup = Awaited<ReturnType<typeof buildBackup>>;

/**
 * Arma el respaldo completo de una persona: todo lo que haría falta para
 * reconstruir sus finanzas desde cero si la base desapareciera.
 *
 * Lo que queda fuera, y por qué:
 *
 * - `AccountBalanceSnapshot`: los saldos se calculan como saldo inicial + Σ
 *   movimientos. Guardarlos sería copiar un resultado que se vuelve a obtener
 *   solo, con el riesgo de restaurarlo desincronizado de los movimientos.
 * - `StatementImport` y `StagedTransaction`: son la bandeja de trabajo de una
 *   importación. Lo que se aprobó ya vive como movimiento; lo que no, es
 *   borrador. Además `rawResponse` guarda la respuesta cruda del extractor y
 *   pesa más que todo lo demás junto.
 * - `InsightDismissal`: qué avisos se cerraron en la interfaz. Se vuelven a
 *   cerrar en un segundo y no es información financiera.
 * - `PushSubscription`: son credenciales de un navegador concreto, atadas al
 *   dispositivo. No se restauran, se vuelven a conceder, y meterlas en un
 *   archivo que se descarga sería repartir llaves.
 * - `ReminderSent`: bitácora de avisos ya mandados. Solo sirve para no repetir
 *   un aviso de una fecha que, cuando se restaure, ya pasó.
 *
 * `passwordHash` tampoco sale nunca: un respaldo es un archivo que se descarga,
 * se manda por correo y acaba en cualquier carpeta.
 */
export async function buildBackup(userId: string) {
  const [
    user,
    monthlyIncomes,
    categories,
    tags,
    accounts,
    transactions,
    fixedPayments,
    debts,
    budgets,
    goals,
    categoryRules,
    subscriptions,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        incomeMode: true,
        monthlyIncome: true,
        createdAt: true,
      },
    }),
    prisma.monthlyIncome.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    // Las categorías son un catálogo común a todas las personas de la
    // instancia, no de quien respalda. Van completas de todos modos porque
    // cada movimiento, presupuesto y pago fijo apunta a una: sin ellas el
    // respaldo restauraría cifras sin nombre.
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: { tags: { select: { id: true } } },
    }),
    prisma.fixedPayment.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.debt.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { payments: { orderBy: { date: "asc" } } },
    }),
    prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { contributions: { orderBy: { date: "asc" } } },
    }),
    // Las reglas de categorización no cuelgan de una persona en el modelo,
    // pero son trabajo acumulado: cada corrección en la bandeja de importación
    // deja una. Perderlas significa volver a enseñarle a la app desde cero.
    prisma.categoryRule.findMany({ orderBy: { priority: "desc" } }),
    prisma.subscription.findMany({ where: { userId }, orderBy: { lastChargeAt: "asc" } }),
  ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      incomeMode: user.incomeMode,
      monthlyIncome: money(user.monthlyIncome),
      createdAt: when(user.createdAt),
    },
    monthlyIncomes: monthlyIncomes.map((row) => ({
      id: row.id,
      month: row.month,
      year: row.year,
      amount: money(row.amount),
    })),
    categories: categories.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      parentId: row.parentId,
      essential: row.essential,
      savings: row.savings,
      archived: row.archived,
      sortOrder: row.sortOrder,
    })),
    tags: tags.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color,
    })),
    accounts: accounts.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      institution: row.institution,
      last4: row.last4,
      initialBalance: money(row.initialBalance),
      creditLimit: money(row.creditLimit),
      cutoffDay: row.cutoffDay,
      paymentDueDay: row.paymentDueDay,
      includeInNetWorth: row.includeInNetWorth,
      liquid: row.liquid,
      archived: row.archived,
      color: row.color,
    })),
    transactions: transactions.map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: money(row.amount),
      date: when(row.date),
      description: row.description,
      note: row.note,
      merchantKey: row.merchantKey,
      source: row.source,
      categoryId: row.categoryId,
      accountId: row.accountId,
      transferAccountId: row.transferAccountId,
      excludeFromStats: row.excludeFromStats,
      externalId: row.externalId,
      dedupeHash: row.dedupeHash,
      tagIds: row.tags.map((tag) => tag.id),
    })),
    fixedPayments: fixedPayments.map((row) => ({
      id: row.id,
      name: row.name,
      amount: money(row.amount),
      kind: row.kind,
      dueDay: row.dueDay,
      dueMonth: row.dueMonth,
      frequency: row.frequency,
      active: row.active,
      categoryId: row.categoryId,
      accountId: row.accountId,
      lastPaidAt: when(row.lastPaidAt),
    })),
    debts: debts.map((row) => ({
      id: row.id,
      name: row.name,
      counterparty: row.counterparty,
      type: row.type,
      totalAmount: money(row.totalAmount),
      interestRate: money(row.interestRate),
      startDate: when(row.startDate),
      note: row.note,
      payments: row.payments.map((payment) => ({
        id: payment.id,
        amount: money(payment.amount),
        date: when(payment.date),
        note: payment.note,
      })),
    })),
    budgets: budgets.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      amount: money(row.amount),
      percent: money(row.percent),
      adjustment: money(row.adjustment),
      month: row.month,
      year: row.year,
    })),
    goals: goals.map((row) => ({
      id: row.id,
      name: row.name,
      targetAmount: money(row.targetAmount),
      targetDate: when(row.targetDate),
      accountId: row.accountId,
      color: row.color,
      archived: row.archived,
      contributions: row.contributions.map((contribution) => ({
        id: contribution.id,
        amount: money(contribution.amount),
        date: when(contribution.date),
        note: contribution.note,
      })),
    })),
    categoryRules: categoryRules.map((row) => ({
      id: row.id,
      pattern: row.pattern,
      matchType: row.matchType,
      categoryId: row.categoryId,
      priority: row.priority,
      active: row.active,
      learned: row.learned,
      hitCount: row.hitCount,
    })),
    subscriptions: subscriptions.map((row) => ({
      id: row.id,
      merchantKey: row.merchantKey,
      label: row.label,
      lastAmount: money(row.lastAmount),
      previousAmount: money(row.previousAmount),
      cadenceDays: row.cadenceDays,
      occurrences: row.occurrences,
      lastChargeAt: when(row.lastChargeAt),
      status: row.status,
      fixedPaymentId: row.fixedPaymentId,
    })),
  };
}

/** Cuántas filas lleva el respaldo, por tabla. Para poder decirle a la persona
 *  qué se llevó sin que tenga que abrir el archivo. */
export function countBackup(backup: Backup): Record<string, number> {
  return {
    ingresosMensuales: backup.monthlyIncomes.length,
    categorias: backup.categories.length,
    etiquetas: backup.tags.length,
    cuentas: backup.accounts.length,
    movimientos: backup.transactions.length,
    pagosFijos: backup.fixedPayments.length,
    deudas: backup.debts.length,
    pagosDeDeuda: backup.debts.reduce((sum, debt) => sum + debt.payments.length, 0),
    presupuestos: backup.budgets.length,
    metas: backup.goals.length,
    aportacionesAMetas: backup.goals.reduce(
      (sum, goal) => sum + goal.contributions.length,
      0
    ),
    reglas: backup.categoryRules.length,
    suscripciones: backup.subscriptions.length,
  };
}
