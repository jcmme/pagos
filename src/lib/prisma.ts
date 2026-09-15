import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // En Vercel cada petición puede levantar su propia instancia, y cada una
    // abría hasta 10 conexiones (el default de pg) que además tardaban en
    // liberarse. Con varias instancias a la vez eso agota el pooler de
    // Supabase y las páginas empiezan a responder 500.
    //
    // Una instancia atiende una petición a la vez, así que una sola conexión
    // basta: las consultas en paralelo de una misma página se encolan, que a
    // esta escala cuesta milisegundos.
    max: 1,
    // Soltar pronto la conexión para que no quede ocupando lugar en el pooler
    // mientras la instancia está inactiva.
    idleTimeoutMillis: 10_000,
    // Fallar rápido y con un error claro en vez de quedarse colgado.
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Se cachea también en producción: si el módulo llega a evaluarse más de una
// vez en la misma instancia, no se crean pools de más.
globalForPrisma.prisma = prisma;
