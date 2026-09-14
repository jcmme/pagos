import { z } from "zod";

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Selecciona una categoría"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
