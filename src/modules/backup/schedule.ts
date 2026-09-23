import { prisma } from "@/lib/prisma";
import { sendBackupEmail } from "@/lib/email";
import { buildBackup, countBackup } from "@/modules/backup/export";

// Domingo. El respaldo viaja pegado al cron diario de recordatorios en vez de
// tener el suyo: el plan Hobby de Vercel permite dos tareas programadas y las
// dos ya están ocupadas. Colgarse de la que corre todos los días y elegir un
// día de la semana sale igual de puntual y no gasta el cupo.
const BACKUP_WEEKDAY = 0;

// El día de la semana decide, y no una fecha guardada en la base. Eso evita
// una tabla nueva —o sea, una migración— solo para recordar cuándo se mandó el
// último. Una migración es exactamente el riesgo del que esto protege, así que
// no tiene sentido correrlo para instalar la protección.
export function backupDueToday(now: Date): boolean {
  return now.getUTCDay() === BACKUP_WEEKDAY;
}

/**
 * Manda a cada persona activa su respaldo por correo.
 *
 * Nunca tumba al cron que la llama: si a una persona le falla el envío, se
 * anota y se sigue con las demás. Un respaldo que no salió no puede además
 * costar los recordatorios de pago de todos los demás.
 */
export async function sendWeeklyBackups(): Promise<{
  sent: number;
  skipped: number;
  failed: string[];
}> {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, email: true },
  });

  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const user of users) {
    try {
      const backup = await buildBackup(user.id);
      const result = await sendBackupEmail({
        to: user.email,
        filename: `pagos-respaldo-${today}.json`,
        json: JSON.stringify(backup, null, 2),
        counts: countBackup(backup),
      });

      // `skipped` es la señal de que no hay RESEND_API_KEY: en local es lo
      // normal y no es un fallo.
      if (result && "skipped" in result) skipped++;
      else sent++;
    } catch (error) {
      failed.push(`${user.email}: ${error instanceof Error ? error.message : "error"}`);
    }
  }

  return { sent, skipped, failed };
}
