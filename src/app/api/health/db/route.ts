import { NextRequest, NextResponse } from "next/server";
import { readConnectionString } from "@/lib/db-url";

// Diagnóstico de la conexión: en serverless la app debe salir por el pooler de
// transacciones (puerto 6543), no por el de sesión. Como esa diferencia solo se
// ve desde dentro del despliegue, este endpoint la reporta sin exponer la
// contraseña. Va protegido con SETUP_SECRET, igual que /api/setup.
export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");
  if (!setupSecret || provided !== setupSecret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  function describe(raw: string | undefined) {
    const value = readConnectionString(raw);
    if (!value) return null;
    try {
      const url = new URL(value);
      return {
        host: url.hostname,
        port: url.port || "(default)",
        user: url.username,
        params: url.search || "(ninguno)",
        hadWhitespace: raw !== value,
      };
    } catch {
      return { error: "no es una URL válida" };
    }
  }

  return NextResponse.json({
    DATABASE_URL: describe(process.env.DATABASE_URL),
    DIRECT_URL: describe(process.env.DIRECT_URL),
  });
}
