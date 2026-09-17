import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { runtimeConnectionString } from "./db-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: runtimeConnectionString(),
    // La conexión sale por el pooler de transacciones, que multiplexa: estas
    // no son conexiones reales de Postgres, así que unas pocas por instancia
    // no saturan la base.
    //
    // Y hacen falta: Vercel activa Fluid compute por defecto, o sea que una
    // misma instancia atiende varias peticiones a la vez. Con una sola
    // conexión se encolaban unas detrás de otras hasta agotar el timeout.
    max: 5,
    // Soltar pronto la conexión para que no quede ocupando lugar en el pooler
    // mientras la instancia está inactiva.
    idleTimeoutMillis: 10_000,
    // Margen para que una ráfaga de peticiones espere su turno en vez de
    // fallar, pero sin quedarse colgada si la base de verdad no responde.
    connectionTimeoutMillis: 20_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Se cachea también en producción: si el módulo llega a evaluarse más de una
// vez en la misma instancia, no se crean pools de más.
globalForPrisma.prisma = prisma;
