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

const SUPABASE_POOLER_HOST_SUFFIX = ".pooler.supabase.com";
const SESSION_POOLER_PORT = "5432";
const TRANSACTION_POOLER_PORT = "6543";

// En serverless el runtime tiene que salir por el pooler de transacciones
// (6543), que multiplexa muchas instancias sobre pocas conexiones reales. Por
// el de sesión (5432) cada instancia reserva la suya y la base se satura: es
// exactamente el 500 bajo carga que costó días encontrar.
//
// Eso es una propiedad del despliegue, no una preferencia configurable, así
// que se impone aquí en vez de depender de que la variable esté bien escrita
// en el panel. Solo se aplica cuando el host es el pooler de Supabase y
// DIRECT_URL existe, o sea cuando las migraciones ya tienen garantizada su
// propia conexión de sesión: sin eso, cambiar el puerto las rompería.
export function toRuntimeConnectionString(
  databaseUrl: string | undefined,
  directUrl: string | undefined
): string | undefined {
  const value = readConnectionString(databaseUrl);
  if (!value) return undefined;
  if (!readConnectionString(directUrl)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!url.hostname.endsWith(SUPABASE_POOLER_HOST_SUFFIX)) return value;
  if (url.port !== SESSION_POOLER_PORT) return value;

  url.port = TRANSACTION_POOLER_PORT;
  url.searchParams.set("pgbouncer", "true");
  return url.toString();
}

// La URL que usa la app en cada petición.
export function runtimeConnectionString(): string | undefined {
  return toRuntimeConnectionString(
    process.env.DATABASE_URL,
    process.env.DIRECT_URL
  );
}
