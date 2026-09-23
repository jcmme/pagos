"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { parseBackup, restoreBackup } from "@/modules/backup/restore";

export type RestoreState = {
  error: string | null;
  restored: Record<string, number> | null;
  warnings: string[];
};

// Restaurar reemplaza todo lo de la persona, así que no puede dispararse con
// un clic distraído: el formulario exige escribir la palabra completa. No es
// decoración, es la única barrera entre un toque accidental y perder lo que
// haya capturado desde el respaldo.
const CONFIRMATION = "RESTAURAR";

export async function restoreFromFile(
  _prev: RestoreState,
  formData: FormData
): Promise<RestoreState> {
  const userId = await requireUserId();

  if (formData.get("confirmacion") !== CONFIRMATION) {
    return {
      error: `Escribe ${CONFIRMATION} para confirmar.`,
      restored: null,
      warnings: [],
    };
  }

  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elige un archivo de respaldo.", restored: null, warnings: [] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return {
      error: "El archivo no es un JSON válido. ¿Es el respaldo que descargaste?",
      restored: null,
      warnings: [],
    };
  }

  try {
    // Validar antes de tocar nada: si el archivo no sirve, la base se queda
    // como está y el mensaje lo explica.
    const backup = parseBackup(raw);
    const report = await restoreBackup(userId, backup);

    // Todas las pantallas leen de la base, y acaba de cambiar entera.
    revalidatePath("/", "layout");

    return { error: null, restored: report.restored, warnings: report.warnings };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo restaurar.",
      restored: null,
      warnings: [],
    };
  }
}
