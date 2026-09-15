import { z } from "zod";

export const fixedPaymentSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
    amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
    kind: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE"),
    frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]),
    dueDay: z.coerce.number().int().min(1).max(31),
    dueMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
    categoryId: z.string().optional().nullable(),
  })
  .refine((data) => data.frequency !== "WEEKLY" || data.dueDay <= 7, {
    message: "El día de la semana debe estar entre 1 y 7",
    path: ["dueDay"],
  })
  .refine((data) => data.frequency !== "YEARLY" || !!data.dueMonth, {
    message: "Selecciona el mes para un pago anual",
    path: ["dueMonth"],
  });

export type FixedPaymentInput = z.infer<typeof fixedPaymentSchema>;
