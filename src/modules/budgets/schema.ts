import { z } from "zod";

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Selecciona una categoría"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

// El reparto llega completo, con todas las categorías raíz de una vez, porque
// un porcentaje suelto no se puede validar: lo que importa es que la suma no
// pase de 100.
//
// Quedarse corto no es un error: el resto se va a ahorro. Pasarse sí, y hay que
// corregirlo antes de guardar.
export const allocationSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    entries: z.array(
      z.object({
        categoryId: z.string().min(1),
        percent: z
          .number()
          .min(0, "Un porcentaje no puede ser negativo")
          .max(100, "Un porcentaje no puede pasar de 100"),
      })
    ),
  })
  .refine(
    (data) => data.entries.reduce((sum, entry) => sum + entry.percent, 0) <= 100,
    {
      message: "El reparto pasa del 100%: baja algún porcentaje",
      path: ["entries"],
    }
  );
