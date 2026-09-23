"use client";

import { useActionState, useState } from "react";
import { UserPlus, ShieldCheck, DownloadCloud, RotateCcw } from "lucide-react";
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
import { restoreFromFile, type RestoreState } from "@/modules/backup/actions";

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

// Lo que el respaldo se lleva, en el orden en que a alguien le importaría
// perderlo. Se muestra con su cuenta para que descargar no sea un acto de fe:
// si un renglón dice 0 y no debería, se nota antes de necesitar el archivo.
const BACKUP_ROWS: { key: keyof BackupCounts; label: string }[] = [
  { key: "movimientos", label: "Movimientos" },
  { key: "cuentas", label: "Cuentas" },
  { key: "pagosFijos", label: "Pagos fijos" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "deudas", label: "Deudas" },
  { key: "metas", label: "Metas de ahorro" },
  { key: "categorias", label: "Categorías" },
  { key: "reglas", label: "Reglas de categorización" },
];

export type BackupCounts = {
  movimientos: number;
  cuentas: number;
  pagosFijos: number;
  presupuestos: number;
  deudas: number;
  metas: number;
  categorias: number;
  reglas: number;
};

function BackupCard({ counts }: { counts: BackupCounts }) {
  return (
    <Card>
      <CardTitle className="mb-1">Respaldo</CardTitle>
      <p className="mb-3 text-[12px] text-(--foreground-subtle)">
        Un archivo con todo lo que has capturado. Guárdalo donde no dependa de
        esta app: si algún día la base se pierde, es lo único que te devuelve
        tus presupuestos, deudas y pagos fijos, no solo la lista de gastos.
      </p>

      <div className="mb-4 flex flex-col gap-1.5">
        {BACKUP_ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-(--foreground-muted)">{label}</span>
            <span className="text-[13px] tabular-nums">{counts[key]}</span>
          </div>
        ))}
      </div>

      {/* Descarga directa, sin JavaScript de por medio: el navegador guarda el
          archivo que manda el servidor. En iOS cae en Archivos, que es donde
          sirve tenerlo. */}
      <a href="/api/backup" download>
        <Button variant="secondary" className="w-full">
          <DownloadCloud size={ICON.md} /> Descargar respaldo
        </Button>
      </a>

      <p className="mt-3 text-[12px] text-(--foreground-subtle)">
        Cada domingo te llega uno por correo sin que tengas que hacer nada.
      </p>
    </Card>
  );
}

function RestoreForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(restoreFromFile, {
    error: null,
    restored: null,
    warnings: [],
  } as RestoreState);

  if (state.restored) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[14px] text-(--success)">Listo. Se restauró:</p>
        <div className="flex flex-col gap-1">
          {Object.entries(state.restored)
            .filter(([, count]) => count > 0)
            .map(([label, count]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-(--foreground-muted)">{label}</span>
                <span className="text-[13px] tabular-nums">{count}</span>
              </div>
            ))}
        </div>
        {state.warnings.map((warning) => (
          <p key={warning} className="text-[12px] text-(--foreground-subtle)">
            {warning}
          </p>
        ))}
        <Button onClick={onDone}>Cerrar</Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-[13px] text-(--foreground-muted)">
        Esto <strong>reemplaza</strong> todo lo que tienes ahora con lo que traiga
        el archivo. Lo que hayas capturado después de ese respaldo se pierde.
      </p>

      <Field>
        Archivo de respaldo
        <Input name="archivo" type="file" accept="application/json,.json" required />
      </Field>

      <Field>
        Escribe RESTAURAR para confirmar
        <Input name="confirmacion" required autoComplete="off" placeholder="RESTAURAR" />
      </Field>

      {state.error && <p className="text-[13px] text-(--danger)">{state.error}</p>}

      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Restaurando…" : "Restaurar"}
      </Button>
    </form>
  );
}

export function SettingsClient({
  me,
  users,
  backupCounts,
}: {
  me: { id: string; email: string; name: string | null; role: "ADMIN" | "MEMBER" };
  users: UserRow[];
  backupCounts: BackupCounts;
}) {
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
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

      <BackupCard counts={backupCounts} />

      <Card>
        <CardTitle className="mb-1">Restaurar</CardTitle>
        <p className="mb-3 text-[12px] text-(--foreground-subtle)">
          Vuelve al estado de un respaldo. Reemplaza todo lo que tengas ahora,
          así que solo se usa cuando algo se perdió.
        </p>
        <Button variant="secondary" className="w-full" onClick={() => setRestoring(true)}>
          <RotateCcw size={ICON.md} /> Restaurar desde un archivo
        </Button>
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

      <Modal open={restoring} onClose={() => setRestoring(false)} title="Restaurar respaldo">
        <RestoreForm onDone={() => setRestoring(false)} />
      </Modal>
    </div>
  );
}
