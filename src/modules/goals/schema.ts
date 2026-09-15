import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  targetAmount: z.coerce.number().positive("La meta debe ser mayor a 0"),
  targetDate: z.string().optional().nullable(),
  accountId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (!value || value === "none" ? null : value)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido").default("#30d158"),
});

export const contributionSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1),
  note: z.string().trim().max(200).optional(),
});

export type GoalInput = z.infer<typeof goalSchema>;
