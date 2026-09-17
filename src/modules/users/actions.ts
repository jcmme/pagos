"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ACTION_OK, NOT_FOUND, type ActionState } from "@/lib/action-state";
import { changePasswordSchema, createUserSchema } from "./schema";

export type { ActionState };

async function requireAdminId(): Promise<string | null> {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? userId : null;
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NOT_FOUND;

  // Pedir la actual evita que una sesión abierta y olvidada sirva para dejar
  // fuera al dueño de la cuenta.
  const valid = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!valid) return { error: "Tu contraseña actual no es correcta" };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });

  revalidatePath("/ajustes");
  return ACTION_OK;
}

export async function createUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "Solo el administrador puede dar de alta usuarios" };

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) return { error: "Ya existe un usuario con ese correo" };

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: "MEMBER",
    },
  });

  revalidatePath("/ajustes");
  return ACTION_OK;
}

export async function setUserActive(id: string, active: boolean): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "Solo el administrador puede hacer esto" };
  // Desactivarse a sí mismo dejaría la instalación sin administrador.
  if (id === adminId) return { error: "No puedes desactivar tu propia cuenta" };

  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/ajustes");
  return ACTION_OK;
}
