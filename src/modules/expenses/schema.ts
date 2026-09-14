import { z } from "zod";

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  categoryId: z.string().optional().nullable(),
  note: z.string().trim().max(200).optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const importRowSchema = z.object({
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  note: z.string().trim().max(200).optional(),
});
