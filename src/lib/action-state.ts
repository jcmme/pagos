// El resultado de una Server Action, compartido por todos los módulos. Antes
// estaba redefinido idéntico en cada uno.
export type ActionState = { error: string | null };

export const ACTION_OK: ActionState = { error: null };

// Una acción que no encontró la fila, o que la encontró pero de otra persona,
// responde igual: desde fuera no se distingue entre "no existe" y "no es tuyo".
export const NOT_FOUND: ActionState = { error: "No se encontró el registro" };
