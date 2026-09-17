"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Info,
  Receipt,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NotificationButton } from "@/components/ui/NotificationButton";
import {
  dismissAllNotifications,
  dismissNotification,
} from "@/modules/notifications/actions";
import type {
  NotificationItem,
  NotificationKind,
  NotificationTone,
} from "@/modules/notifications/feed";

// El icono dice de qué se trata; el color, qué tan urgente es.
const KIND_ICONS: Record<Exclude<NotificationKind, "INSIGHT">, typeof Info> = {
  PAYMENT: CalendarClock,
  CARD: CreditCard,
  CUTOFF: Receipt,
  IMPORT: Upload,
};

const TONE_ICONS: Record<NotificationTone, typeof Info> = {
  danger: AlertTriangle,
  warning: TrendingUp,
  success: TrendingDown,
  accent: Info,
  info: Info,
};

const TONE_COLORS: Record<NotificationTone, string> = {
  danger: "text-(--danger)",
  warning: "text-(--warning)",
  success: "text-(--success)",
  accent: "text-(--accent)",
  info: "text-(--accent)",
};

function iconFor(item: NotificationItem) {
  return item.kind === "INSIGHT" ? TONE_ICONS[item.tone] : KIND_ICONS[item.kind];
}

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <NotificationButton count={notifications.length} onClick={() => setOpen(true)} />

      <Modal open={open} onClose={() => setOpen(false)} title="Avisos">
        {notifications.length === 0 ? (
          <p className="py-4 text-center text-[14px] text-(--foreground-muted)">
            Nada pendiente por ahora.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {notifications.map((item) => {
              const Icon = iconFor(item);
              const body = (
                <div className="flex items-start gap-3">
                  <Icon size={17} className={`mt-0.5 shrink-0 ${TONE_COLORS[item.tone]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[13px] text-(--foreground-muted)">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );

              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-2 rounded-(--radius-md) p-2 hover:bg-(--surface-2)"
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="min-w-0 flex-1"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{body}</div>
                  )}

                  <button
                    disabled={pending}
                    onClick={() => startTransition(() => dismissNotification(item.key))}
                    className="shrink-0 rounded-full p-1 text-(--foreground-subtle) hover:bg-(--surface-3) hover:text-(--foreground)"
                    aria-label={`Descartar ${item.title}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}

            {notifications.length > 1 && (
              <button
                disabled={pending}
                onClick={() => {
                  const keys = notifications.map((item) => item.key);
                  startTransition(() => dismissAllNotifications(keys));
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-(--radius-md) py-2 text-[14px] text-(--accent) hover:bg-(--surface-2) disabled:opacity-40"
              >
                Marcar todo como visto
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
