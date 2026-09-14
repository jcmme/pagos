import { z } from "zod";

export const debtSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  counterparty: z.string().trim().max(60).optional(),
  type: z.enum(["OWE", "OWED"]),
  totalAmount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  interestRate: z.coerce.number().min(0).max(100).optional().nullable(),
  startDate: z.string().min(1),
  note: z.string().trim().max(200).optional(),
});

export type DebtInput = z.infer<typeof debtSchema>;

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1),
  note: z.string().trim().max(200).optional(),
});
