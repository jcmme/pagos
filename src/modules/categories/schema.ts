import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
