import { z } from "zod";

// Doce caracteres en vez de ocho: la app guarda todo el detalle financiero de
// una persona y solo hay una puerta de entrada.
const password = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .max(100);

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Escribe tu contraseña actual"),
    next: password,
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Las contraseñas nuevas no coinciden",
    path: ["confirm"],
  })
  .refine((data) => data.next !== data.current, {
    message: "La contraseña nueva tiene que ser distinta de la actual",
    path: ["next"],
  });

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  name: z.string().trim().max(60).optional(),
  password,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
