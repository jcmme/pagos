-- El ingreso del mes y el presupuesto por porcentaje.
--
-- Escrita a mano por una razón concreta: `Budget.amount` deja de ser
-- obligatorio, y un presupuesto tiene que quedar definido por un monto fijo o
-- por un porcentaje, nunca por los dos ni por ninguno. Eso no se expresa en el
-- esquema de Prisma, así que va como CHECK: es la regla de la que depende todo
-- el cálculo, y conviene que la base la defienda aunque un día se cuele un
-- update sin pasar por zod.
--
-- Las filas que ya existen tienen monto y no tienen porcentaje, así que
-- cumplen el CHECK desde el primer momento.

-- CreateEnum
CREATE TYPE "IncomeMode" AS ENUM ('FIJO', 'VARIABLE');

-- AlterTable: el modo de ingreso y el sueldo base.
--
-- VARIABLE es el valor por omisión porque es lo honesto: la app no sabe cuánto
-- gana nadie, y en VARIABLE sin capturar simplemente no calcula. Con FIJO por
-- omisión y monthlyIncome nulo el resultado sería el mismo, pero el
-- interruptor estaría mintiendo sobre lo que hay guardado.
ALTER TABLE "User" ADD COLUMN     "incomeMode" "IncomeMode" NOT NULL DEFAULT 'VARIABLE',
ADD COLUMN     "monthlyIncome" DECIMAL(12,2);

-- AlterTable: la categoría donde cae lo que no se reparte.
ALTER TABLE "Category" ADD COLUMN     "savings" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MonthlyIncome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyIncome_userId_month_year_key" ON "MonthlyIncome"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "MonthlyIncome" ADD CONSTRAINT "MonthlyIncome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: el presupuesto por porcentaje y la corrección del mes.
ALTER TABLE "Budget" ADD COLUMN     "percent" DECIMAL(5,2),
ADD COLUMN     "adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "Budget" ALTER COLUMN "amount" DROP NOT NULL;

-- Uno de los dos, nunca ambos.
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_monto_o_porcentaje"
CHECK (("amount" IS NOT NULL) <> ("percent" IS NOT NULL));

-- Un porcentaje fuera de (0, 100] no significa nada.
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_porcentaje_en_rango"
CHECK ("percent" IS NULL OR ("percent" > 0 AND "percent" <= 100));
