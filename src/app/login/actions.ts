"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw err;
  }
}
