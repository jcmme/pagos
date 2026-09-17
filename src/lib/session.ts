import { auth } from "@/auth";

export type SessionUser = { id: string; email: string };

// Toda consulta de datos financieros pasa por aquí: el dueño sale de la
// sesión, nunca del formulario ni de la URL. Así un id ajeno no alcanza para
// leer ni tocar lo de otra persona.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    // El proxy ya redirige al login antes de llegar aquí, así que esto solo
    // pasa si algo se llama fuera de una petición autenticada.
    throw new Error("No hay sesión");
  }
  return id;
}
