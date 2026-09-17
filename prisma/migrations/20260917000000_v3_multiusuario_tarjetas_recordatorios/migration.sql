-- v3: cada quien lleva sus propias finanzas, las tarjetas guardan sus fechas
-- y los recordatorios dejan rastro de qué se avisó.
--
-- Escrita a mano: `prisma migrate diff` genera `ADD COLUMN "userId" TEXT NOT
-- NULL` de una sola vez, que falla en cuanto hay una fila. Aquí la columna
-- entra nullable, se rellena con el dueño actual y solo entonces se marca
-- obligatoria. Si no hubiera ningún usuario y sí datos, la migración falla a
-- propósito en vez de inventarse un dueño.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('FIXED_PAYMENT', 'CARD_PAYMENT');

-- AlterTable: usuarios con nombre, rol y baja lógica
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- El usuario que ya existía es el administrador.
UPDATE "User" SET "role" = 'ADMIN'
WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);

-- AlterTable: tarjetas de crédito
ALTER TABLE "Account" ADD COLUMN     "cutoffDay" INTEGER,
ADD COLUMN     "paymentDueDay" INTEGER;

-- AlterTable: el pago fijo sabe con qué cuenta se paga y deja de llevar su
-- propio "ya avisé" (ahora eso vive en ReminderSent).
ALTER TABLE "FixedPayment" DROP COLUMN "lastNotifiedAt",
ADD COLUMN     "accountId" TEXT;

-- Dueño: primero nullable
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;
ALTER TABLE "Account" ADD COLUMN "userId" TEXT;
ALTER TABLE "StatementImport" ADD COLUMN "userId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "userId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "userId" TEXT;
ALTER TABLE "FixedPayment" ADD COLUMN "userId" TEXT;
ALTER TABLE "Debt" ADD COLUMN "userId" TEXT;
ALTER TABLE "Budget" ADD COLUMN "userId" TEXT;

-- InsightDismissal cambia de llave primaria: antes era la propia clave del
-- insight, que ahora se repite entre usuarios.
ALTER TABLE "InsightDismissal" ADD COLUMN "id" TEXT;
ALTER TABLE "InsightDismissal" ADD COLUMN "userId" TEXT;
UPDATE "InsightDismissal" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;

-- Relleno: todo lo que ya existía es del administrador.
DO $$
DECLARE owner_id TEXT;
BEGIN
  SELECT "id" INTO owner_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

  UPDATE "Transaction"      SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "Account"          SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "StatementImport"  SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "Subscription"     SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "SavingsGoal"      SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "FixedPayment"     SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "Debt"             SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "Budget"           SET "userId" = owner_id WHERE "userId" IS NULL;
  UPDATE "InsightDismissal" SET "userId" = owner_id WHERE "userId" IS NULL;
END $$;

-- Y ahora sí, obligatorio.
ALTER TABLE "Transaction"      ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Account"          ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "StatementImport"  ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Subscription"     ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "SavingsGoal"      ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "FixedPayment"     ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Debt"             ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Budget"           ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "InsightDismissal" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "InsightDismissal" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "InsightDismissal" DROP CONSTRAINT "InsightDismissal_pkey";
ALTER TABLE "InsightDismissal" ADD CONSTRAINT "InsightDismissal_pkey" PRIMARY KEY ("id");

-- DropIndex: los únicos globales pasan a serlo por usuario.
DROP INDEX "Budget_categoryId_month_year_key";
DROP INDEX "StatementImport_fileHash_key";
DROP INDEX "StatementImport_status_idx";
DROP INDEX "Subscription_merchantKey_key";
DROP INDEX "Transaction_date_idx";
DROP INDEX "Transaction_externalId_key";
DROP INDEX "Transaction_merchantKey_idx";

-- CreateTable
CREATE TABLE "ReminderSent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderSent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReminderSent_userId_sentAt_idx" ON "ReminderSent"("userId", "sentAt");
CREATE UNIQUE INDEX "ReminderSent_kind_refId_dueDate_daysBefore_key" ON "ReminderSent"("kind", "refId", "dueDate", "daysBefore");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");
CREATE INDEX "FixedPayment_userId_active_idx" ON "FixedPayment"("userId", "active");
CREATE UNIQUE INDEX "InsightDismissal_userId_key_key" ON "InsightDismissal"("userId", "key");
CREATE INDEX "SavingsGoal_userId_idx" ON "SavingsGoal"("userId");
CREATE INDEX "StatementImport_userId_status_idx" ON "StatementImport"("userId", "status");
CREATE UNIQUE INDEX "StatementImport_userId_fileHash_key" ON "StatementImport"("userId", "fileHash");
CREATE UNIQUE INDEX "Subscription_userId_merchantKey_key" ON "Subscription"("userId", "merchantKey");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_merchantKey_idx" ON "Transaction"("userId", "merchantKey");
CREATE UNIQUE INDEX "Transaction_userId_externalId_key" ON "Transaction"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatementImport" ADD CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsightDismissal" ADD CONSTRAINT "InsightDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedPayment" ADD CONSTRAINT "FixedPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FixedPayment" ADD CONSTRAINT "FixedPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSent" ADD CONSTRAINT "ReminderSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
