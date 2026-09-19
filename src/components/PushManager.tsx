"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ICON } from "@/lib/icons";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

export function PushManager() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isPushSupported()) return;

    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (cancelled) return;
      setSupported(true);
      setSubscribed(!!sub);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <Card className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {subscribed ? <Bell size={ICON.md} className="text-(--accent)" /> : <BellOff size={ICON.md} className="text-(--foreground-subtle)" />}
        <div>
          <CardTitle>Notificaciones push</CardTitle>
          <p className="text-[13px] text-(--foreground-muted)">
            {subscribed ? "Activas en este dispositivo" : "Recibe avisos de pagos próximos"}
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
      >
        {subscribed ? "Desactivar" : "Activar"}
      </Button>
    </Card>
  );
}
