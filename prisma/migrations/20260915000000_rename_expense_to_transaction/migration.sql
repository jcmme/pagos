-- Escrita a mano: `prisma migrate dev` generaba DROP TABLE "Expense" seguido de
-- CREATE TABLE "Transaction", lo que habría borrado todos los gastos ya
-- capturados. El rename conserva las filas.

-- ---------------------------------------------------------------------------
-- Categorías jerárquicas (dos niveles) y marca de gasto esencial
-- ---------------------------------------------------------------------------
DROP INDEX "Category_name_key";

ALTER TABLE "Category"
  ADD COLUMN "parentId"  TEXT,
  ADD COLUMN "essential" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archived"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

ALTER TABLE "Category"
  ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Postgres considera distintos entre sí los NULL, así que un UNIQUE(parentId,
-- name) dejaría pasar dos categorías raíz con el mismo nombre. Se necesitan
-- dos índices parciales para cubrir ambos casos.
CREATE UNIQUE INDEX "Category_root_name_key"
  ON "Category"("name") WHERE "parentId" IS NULL;
CREATE UNIQUE INDEX "Category_child_name_key"
  ON "Category"("parentId", "name") WHERE "parentId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Expense -> Transaction
-- ---------------------------------------------------------------------------
CREATE TYPE "TxKind" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

ALTER TYPE "ExpenseSource" RENAME TO "TxSource";
ALTER TYPE "TxSource" ADD VALUE 'RECURRING';

ALTER TABLE "Expense" RENAME TO "Transaction";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_pkey" TO "Transaction_pkey";
ALTER TABLE "Transaction" RENAME CONSTRAINT "Expense_categoryId_fkey" TO "Transaction_categoryId_fkey";
ALTER INDEX "Expense_date_idx" RENAME TO "Transaction_date_idx";
ALTER INDEX "Expense_categoryId_idx" RENAME TO "Transaction_categoryId_idx";

ALTER TABLE "Transaction"
  ADD COLUMN "kind"             "TxKind" NOT NULL DEFAULT 'EXPENSE',
  ADD COLUMN "description"      TEXT,
  ADD COLUMN "merchantKey"      TEXT,
  ADD COLUMN "excludeFromStats" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "externalId"       TEXT,
  ADD COLUMN "dedupeHash"       TEXT;

CREATE UNIQUE INDEX "Transaction_externalId_key" ON "Transaction"("externalId");
CREATE INDEX "Transaction_merchantKey_idx" ON "Transaction"("merchantKey");
CREATE INDEX "Transaction_dedupeHash_idx" ON "Transaction"("dedupeHash");
