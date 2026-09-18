"use client";

import { useState, useTransition } from "react";
import { RefreshCw, TrendingUp, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  refreshSubscriptions,
  confirmSubscription,
  dismissSubscription,
} from "@/modules/subscriptions/actions";

type Subscription = {
  id: string;
  merchantKey: string;
  label: string;
  lastAmount: string;
  previousAmount: string | null;
  cadenceDays: number;
  occurrences: number;
  lastChargeAt: string;
  status: "DETECTED" | "CONFIRMED" | "DISMISSED";
  fixedPaymentId: string | null;
};

function cadenceLabel(days: number): string {
  if (days <= 10) return "semanal";
  if (days <= 40) return "mensual";
  if (days <= 100) return "trimestral";
  return "anual";
}

export function SubscriptionsClient({ subscriptions }: { subscriptions: Subscription[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const detected = subscriptions.filter((item) => item.status === "DETECTED");
  const confirmed = subscriptions.filter((item) => item.status === "CONFIRMED");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold">Suscripciones</h1>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(() => refreshSubscriptions())}
          className="gap-1.5"
        >
          <RefreshCw size={15} /> Buscar de nuevo
        </Button>
      </div>

      <p className="mb-5 text-[13px] text-(--foreground-muted)">
        Se detectan buscando cargos del mismo comercio que se repiten con monto parecido y
        separación regular.
      </p>

      {error && <p className="mb-3 text-[13px] text-(--danger)">{error}</p>}

      <div className="stagger flex flex-col gap-2">
        {detected.map((item) => {
          const last = Number(item.lastAmount);
          const previous = item.previousAmount ? Number(item.previousAmount) : null;
          const raised = previous !== null && last > previous * 1.05;

          return (
            <Card key={item.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">{item.label}</p>
                  <p className="mt-0.5 text-[12px] text-(--foreground-subtle)">
                    {item.occurrences} cargos · {cadenceLabel(item.cadenceDays)} · último{" "}
                    {formatDate(item.lastChargeAt)}
                  </p>
                  {raised && (
                    <Badge tone="warning" className="mt-2 gap-1">
                      <TrendingUp size={11} /> Subió de {formatCurrency(previous)} a{" "}
                      {formatCurrency(last)}
                    </Badge>
                  )}
                </div>
                <p className="shrink-0 text-[16px] font-semibold">{formatCurrency(last)}</p>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await confirmSubscription(item.id);
                      if (result.error) setError(result.error);
                    })
                  }
                  className="gap-1.5"
                >
                  <Check size={15} /> Convertir en pago fijo
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => startTransition(() => dismissSubscription(item.id))}
                  className="gap-1.5"
                >
                  <X size={15} /> No es suscripción
                </Button>
              </div>
            </Card>
          );
        })}

        {detected.length === 0 && (
          <p className="text-[14px] text-(--foreground-muted)">
            No se detectaron suscripciones nuevas. Necesitas al menos tres cargos del mismo
            comercio para que aparezcan aquí.
          </p>
        )}
      </div>

      {confirmed.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[13px] text-(--foreground-muted)">
            Ya registradas como pago fijo
          </p>
          <div className="flex flex-col gap-1.5">
            {confirmed.map((item) => (
              <Card key={item.id} className="flex items-center justify-between p-3 opacity-70">
                <span className="truncate text-[13px]">{item.label}</span>
                <span className="text-[13px]">{formatCurrency(item.lastAmount)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
