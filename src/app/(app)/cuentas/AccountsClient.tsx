"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, Archive } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SwitchRow } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { cardStatus, daysLabel } from "@/modules/accounts/card-status";
import { ACCOUNT_TYPE_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  archiveAccount,
  type ActionState,
} from "@/modules/accounts/actions";
import type { AccountWithBalance } from "@/modules/accounts/balance";
import { ICON } from "@/lib/icons";
import { IconButton } from "@/components/ui/IconButton";

const initialState: ActionState = { error: null };

function AccountForm({
  action,
  defaults,
  submitLabel,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: AccountWithBalance;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [type, setType] = useState(defaults?.type ?? "CHECKING");

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await action(prev, fd);
      if (!result.error) onSuccess();
      return result;
    },
    initialState,
  );

  const isCard = type === "CREDIT_CARD";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field>
        Nombre
        <Input
          name="name"
          required
          defaultValue={defaults?.name}
          placeholder="Ej. BBVA Nómina"
        />
      </Field>

      <Field>
        Tipo
        <Select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field>
        {defaults ? "Saldo inicial" : "Saldo actual"}
        <Input
          name="initialBalance"
          type="number"
          step="0.01"
          defaultValue={defaults ? defaults.initialBalance : 0}
        />
        <span className="text-[12px] text-(--foreground-subtle)">
          {defaults
            ? `Punto de partida de la cuenta. Con tus movimientos, hoy va en ${formatCurrency(
                defaults.balance,
              )}.`
            : "A partir de aquí el saldo se recalcula solo con tus movimientos."}
        </span>
      </Field>

      <Field>
        Banco (opcional)
        <Input name="institution" defaultValue={defaults?.institution ?? ""} />
      </Field>

      <Field>
        Últimos 4 dígitos (opcional)
        <Input
          name="last4"
          maxLength={4}
          defaultValue={defaults?.last4 ?? ""}
        />
      </Field>

      {/* Solo tienen sentido en una tarjeta; en una cuenta de débito eran
          ruido en el formulario. */}
      {isCard && (
        <>
          <Field>
            Límite de crédito (opcional)
            <Input
              name="creditLimit"
              type="number"
              step="0.01"
              defaultValue={defaults?.creditLimit ?? ""}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              Día de corte
              <Input
                name="cutoffDay"
                type="number"
                min={1}
                max={31}
                placeholder="18"
                defaultValue={defaults?.cutoffDay ?? ""}
              />
            </Field>

            <Field>
              Día límite de pago
              <Input
                name="paymentDueDay"
                type="number"
                min={1}
                max={31}
                placeholder="6"
                defaultValue={defaults?.paymentDueDay ?? ""}
              />
            </Field>
          </div>

          <p className="-mt-1 text-[12px] text-(--foreground-subtle)">
            Con el día límite se te avisa dos días antes y de nuevo el día
            anterior.
          </p>
        </>
      )}

      <Field>
        Color
        <Select
          name="color"
          defaultValue={defaults?.color ?? CATEGORY_COLORS[0]}
        >
          {CATEGORY_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </Select>
      </Field>

      <SwitchRow
        name="liquid"
        defaultChecked={defaults?.liquid ?? true}
        label="Disponible de inmediato"
        hint="Cuenta para el fondo de emergencia."
      />

      <SwitchRow
        name="includeInNetWorth"
        defaultChecked={defaults?.includeInNetWorth ?? true}
        label="Incluir en patrimonio neto"
      />

      {state.error && (
        <p className="text-[13px] text-(--danger)">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}

function CardDetail({ account }: { account: AccountWithBalance }) {
  const status = cardStatus(account);

  if (!status.configured) {
    return (
      <p className="mt-3 border-t border-(--border) pt-3 text-[12px] text-(--foreground-subtle)">
        Agrega el día de corte y el día límite de pago para que se te recuerde.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-(--border) pt-3">
      {status.limit ? (
        <>
          <div className="mb-1 flex justify-between text-[13px] text-(--foreground-muted)">
            <span>Usado</span>
            <span>
              {formatCurrency(status.used)} de {formatCurrency(status.limit)}
            </span>
          </div>
          <ProgressBar value={status.used} max={status.limit} semantics="limit" />
        </>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
        {status.cutoffDays !== null && (
          <span className="text-(--foreground-muted)">
            Corte {daysLabel(status.cutoffDays)}
          </span>
        )}
        {status.dueDays !== null && (
          <span
            className={
              status.dueDays <= 2
                ? "font-medium text-(--warning)"
                : "text-(--foreground-muted)"
            }
          >
            Pago límite {daysLabel(status.dueDays)}
          </span>
        )}
      </div>
    </div>
  );
}

export function AccountsClient({
  accounts,
  netWorth,
}: {
  accounts: AccountWithBalance[];
  netWorth: { assets: number; liabilities: number; total: number };
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);

  const active = accounts.filter((account) => !account.archived);
  const archived = accounts.filter((account) => account.archived);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Cuentas</h1>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus size={ICON.md} /> Nueva cuenta
        </Button>
      </div>

      <Card className="mb-5">
        <CardTitle>Patrimonio neto</CardTitle>
        <p
          className={`mt-1 text-[28px] font-semibold ${
            netWorth.total < 0 ? "text-(--danger)" : ""
          }`}
        >
          {formatCurrency(netWorth.total)}
        </p>
        <div className="mt-2 flex gap-6 text-[13px] text-(--foreground-muted)">
          <span>Activos {formatCurrency(netWorth.assets)}</span>
          <span>Pasivos {formatCurrency(netWorth.liabilities)}</span>
        </div>
      </Card>

      <div className="stagger flex flex-col gap-2">
        {active.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-8 w-1.5 shrink-0 rounded-full"
                  style={{ background: account.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">
                    {account.name}
                  </p>
                  <p className="text-[12px] text-(--foreground-subtle)">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                    {account.last4 ? ` ····${account.last4}` : ""}
                    {account.liquid ? "" : " · no líquida"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`text-[15px] font-medium ${
                    account.balance < 0 ? "text-(--danger)" : ""
                  }`}
                >
                  {formatCurrency(account.balance)}
                </span>
                <IconButton
                  onClick={() => setEditing(account)}
                  aria-label="Editar"
                >
                  <Pencil size={ICON.md} />
                </IconButton>
                <IconButton
                  onClick={() => archiveAccount(account.id, true)}
                  aria-label="Archivar"
                >
                  <Archive size={ICON.md} />
                </IconButton>
                <IconButton
                  onClick={() => deleteAccount(account.id)}
                  tone="danger"
                  aria-label="Eliminar"
                >
                  <Trash2 size={ICON.md} />
                </IconButton>
              </div>
            </div>

            {account.type === "CREDIT_CARD" && <CardDetail account={account} />}
          </Card>
        ))}

        {active.length === 0 && (
          <p className="text-[13px] text-(--foreground-muted)">
            Agrega tus cuentas para poder calcular tu patrimonio, tu fondo de
            emergencia y cuánto tienes disponible para gastar.
          </p>
        )}

        {archived.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[13px] text-(--foreground-muted)">
              Archivadas
            </p>
            {archived.map((account) => (
              <Card
                key={account.id}
                className="mb-2 flex items-center justify-between p-3 opacity-50"
              >
                <span className="text-[14px]">{account.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">
                    {formatCurrency(account.balance)}
                  </Badge>
                  <button
                    onClick={() => archiveAccount(account.id, false)}
                    className="text-[12px] text-(--accent)"
                  >
                    Restaurar
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva cuenta"
      >
        <AccountForm
          action={createAccount}
          submitLabel="Crear"
          onSuccess={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar cuenta"
      >
        {editing && (
          <AccountForm
            action={updateAccount.bind(null, editing.id)}
            defaults={editing}
            submitLabel="Guardar cambios"
            onSuccess={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
