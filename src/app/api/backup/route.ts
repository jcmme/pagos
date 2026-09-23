import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildBackup } from "@/modules/backup/export";

export const dynamic = "force-dynamic";

// El respaldo lee las tablas completas de una persona. En una base con años de
// movimientos eso no cabe en los 10s que Vercel da por defecto en el plan
// Hobby, y el respaldo es justo lo que no puede fallar por un tiempo de espera.
export const maxDuration = 60;

/**
 * Descarga el respaldo completo en JSON.
 *
 * Es aparte de `/api/export`, que entrega un CSV de movimientos para abrir en
 * Excel: ese está pensado para mirar los datos y por eso aplana la información
 * y tira lo que no sea un movimiento. Un respaldo tiene el trabajo contrario
 * —conservar todo sin perder ni una relación—, y los dos formatos no pueden
 * ser el mismo archivo.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const backup = await buildBackup(userId);

  // Con sangría: un respaldo se abre a mano cuando algo salió mal, y una sola
  // línea de varios megas no hay editor que la muestre. Pesa más, pero se
  // descarga comprimido por la red de todos modos.
  const body = JSON.stringify(backup, null, 2);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos-respaldo-${today}.json"`,
      // Un respaldo es de quien lo pide y cambia a cada rato: que no se quede
      // guardado en ninguna caché intermedia.
      "Cache-Control": "no-store, private",
    },
  });
}
