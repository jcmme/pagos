"use server";

import { dismissNotification } from "@/modules/notifications/actions";

// Un insight descartado es un aviso descartado: misma tabla y misma clave. Se
// mantiene el nombre porque es el que usa la lista del dashboard.
export async function dismissInsight(key: string) {
  await dismissNotification(key);
}
