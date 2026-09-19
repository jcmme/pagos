import { z } from "zod";

// Las categorías son catálogo común de la instalación, no de cada persona: así
// los reportes de los dos son comparables y no hay que resembrarlas al dar de
// alta a alguien.
//
// Tres niveles porque el caso real que los pide es "Loreto › Escuela ›
// Inscripción": la persona, el concepto y el detalle.
export const MAX_CATEGORY_DEPTH = 3;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  parentId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (!value || value === "none" ? null : value)),
  // La clave de un icono del catálogo, o null si se prefiere la inicial. No se
  // valida contra la lista: un icono que deje de existir se resuelve a null al
  // leerlo, en vez de impedir guardar la categoría.
  icon: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (!value || value === "none" ? null : value)),
  essential: z.coerce.boolean().default(false),
});

export type CategoryInput = z.infer<typeof categorySchema>;
