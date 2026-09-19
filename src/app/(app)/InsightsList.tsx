"use client";

import { useTransition } from "react";
import Link from "next/link";
import { X, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { dismissInsight } from "@/modules/insights/actions";
import type { Insight } from "@/modules/insights/generate";
import { ICON } from "@/lib/icons";

const TONE_STYLES: Record<Insight["tone"], { color: string; Icon: typeof Info }> = {
  info: { color: "text-(--accent)", Icon: Info },
  success: { color: "text-(--success)", Icon: TrendingDown },
  warning: { color: "text-(--warning)", Icon: TrendingUp },
  danger: { color: "text-(--danger)", Icon: AlertTriangle },
};

export function InsightsList({ insights }: { insights: Insight[] }) {
  const [pending, startTransition] = useTransition();

  if (insights.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {insights.slice(0, 5).map((insight) => {
        const { color, Icon } = TONE_STYLES[insight.tone];
        const body = (
          <div className="flex items-start gap-3">
            <Icon size={ICON.md} className={`mt-0.5 shrink-0 ${color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">{insight.title}</p>
              <p className="mt-0.5 text-[13px] text-(--foreground-muted)">{insight.detail}</p>
            </div>
          </div>
        );

        return (
          <Card key={insight.key} className="flex items-start justify-between gap-2 p-3.5">
            {insight.href ? (
              <Link href={insight.href} className="min-w-0 flex-1">
                {body}
              </Link>
            ) : (
              <div className="min-w-0 flex-1">{body}</div>
            )}

            <button
              disabled={pending}
              onClick={() => startTransition(() => dismissInsight(insight.key))}
              className="shrink-0 rounded-full p-1 text-(--foreground-subtle) hover:bg-(--surface-2) hover:text-(--foreground)"
              aria-label="Descartar"
            >
              <X size={ICON.sm} />
            </button>
          </Card>
        );
      })}
    </div>
  );
}
