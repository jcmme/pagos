// Las connection strings se copian y pegan a mano en el panel de Vercel, y ahí
// es fácil que se cuele un salto de línea o un espacio al inicio o al final.
// Postgres no los tolera: el host queda mal y la conexión falla sin un error
// que apunte a la causa. Una connection string nunca lleva espacios en blanco
// legítimos, así que se quitan todos.
export function readConnectionString(
  value: string | undefined
): string | undefined {
  if (value === undefined) return undefined;

  const cleaned = value.replace(/\s/g, "");
  return cleaned.length > 0 ? cleaned : undefined;
}
