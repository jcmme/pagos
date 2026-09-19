"use client";

import { useActionState, useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ICON } from "@/lib/icons";
import {
  changePassword,
  createUser,
  setUserActive,
  type ActionState,
} from "@/modules/users/actions";

const initialState: ActionState = { error: null };

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
  active: boolean;
};

function PasswordForm() {
  const [done, setDone] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await changePassword(prev, formData);
      setDone(!result.error);
      return result;
    },
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Contraseña actual
        <Input name="current" type="password" required autoComplete="current-password" />
      </Field>

      <Field>
        Contraseña nueva
        <Input name="next" type="password" required autoComplete="new-password" />
        <span className="text-[12px] text-(--foreground-subtle)">
          Al menos 12 caracteres.
        </span>
      </Field>

      <Field>
        Repite la contraseña nueva
        <Input name="confirm" type="password" required autoComplete="new-password" />
      </Field>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}
      {done && !state.error && (
        <p className="text-[13px] text-(--success)">Tu contraseña quedó actualizada.</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

function NewUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createUser(prev, formData);
      if (!result.error) onSuccess();
      return result;
    },
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Correo
        <Input name="email" type="email" required autoComplete="off" />
      </Field>

      <Field>
        Nombre (opcional)
        <Input name="name" maxLength={60} />
      </Field>

      <Field>
        Contraseña inicial
        <Input name="password" type="password" required autoComplete="new-password" />
        <span className="text-[12px] text-(--foreground-subtle)">
          Al menos 12 caracteres. La persona puede cambiarla desde esta misma
          pantalla cuando entre.
        </span>
      </Field>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}

export function SettingsClient({
  me,
  users,
}: {
  me: { id: string; email: string; name: string | null; role: "ADMIN" | "MEMBER" };
  users: UserRow[];
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Tu cuenta</CardTitle>
        <p className="mt-1 text-[14px]">{me.name ?? me.email}</p>
        <p className="text-[13px] text-(--foreground-muted)">{me.email}</p>
        {me.role === "ADMIN" && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-(--foreground-subtle)">
            <ShieldCheck size={ICON.sm} /> Administrador
          </span>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-3">Cambiar contraseña</CardTitle>
        <PasswordForm />
      </Card>

      {me.role === "ADMIN" && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Usuarios</CardTitle>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <UserPlus size={ICON.md} /> Nuevo
            </Button>
          </div>

          <p className="mb-3 text-[12px] text-(--foreground-subtle)">
            Cada quien lleva sus propias cuentas, movimientos y pagos. Las
            categorías son comunes.
          </p>

          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-(--radius-md) bg-(--surface-2) px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{user.name ?? user.email}</p>
                  <p className="truncate text-[12px] text-(--foreground-subtle)">
                    {user.email}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {user.role === "ADMIN" && <Badge tone="accent">Admin</Badge>}
                  {!user.active && <Badge tone="neutral">Inactivo</Badge>}
                  {user.id !== me.id && (
                    <button
                      onClick={async () => {
                        const result = await setUserActive(user.id, !user.active);
                        setError(result.error);
                      }}
                      className="text-[12px] text-(--foreground-muted) hover:text-(--foreground)"
                    >
                      {user.active ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-[13px] text-(--danger)">{error}</p>}
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo usuario">
        <NewUserForm onSuccess={() => setCreating(false)} />
      </Modal>
    </div>
  );
}
