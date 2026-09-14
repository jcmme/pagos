"use client";

import { useActionState } from "react";
import { loginAction, LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Email
        <Input type="email" name="email" required autoComplete="email" placeholder="tu@email.com" />
      </Field>
      <Field>
        Contraseña
        <Input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
      </Field>
      {state.error && (
        <p className="text-[13px] text-(--danger)">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
