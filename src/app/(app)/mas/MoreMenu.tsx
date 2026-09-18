"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { NAV_ITEMS, PRIMARY_HREFS } from "@/components/layout/nav";
import { DEMOS } from "./demos";

const REST = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));

export function MoreMenu() {
  const container = useRef<HTMLDivElement>(null);

  // Cada miniatura se reproduce una sola vez, cuando su fila entra en
  // pantalla. El observador solo marca data-play y deja de observar: la
  // animación es CSS, así que no hay un temporizador por fila ni un estado de
  // React que provoque nueve renders.
  useEffect(() => {
    const rows = container.current?.querySelectorAll<HTMLElement>("[data-demo]");
    if (!rows || rows.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.play = "true";
          observer.unobserve(entry.target);
        }
      },
      // Un cuarto de la fila basta para que se note; esperar a que esté
      // completa deja la última sin dispararse en pantallas cortas.
      { threshold: 0.25 }
    );

    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="flex flex-col gap-2">
      {REST.map((item) => {
        const Icon = item.icon;
        const entry = DEMOS[item.href];

        return (
          <Link key={item.href} href={item.href} data-demo data-play="false">
            <Card className="pressable flex items-center gap-3 p-4">
              <Icon size={19} className="shrink-0 text-(--accent)" />

              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{item.label}</span>
                {entry && (
                  <span className="mt-0.5 block text-[12px] leading-tight text-(--foreground-muted)">
                    {entry.detail}
                  </span>
                )}
              </span>

              {entry?.demo}

              <ChevronRight size={17} className="shrink-0 text-(--foreground-subtle)" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
