import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-(--surface-3) text-(--foreground-muted)",
  success: "bg-[rgb(var(--success-rgb)/0.15)] text-(--success)",
  warning: "bg-[rgb(var(--warning-rgb)/0.15)] text-(--warning)",
  danger: "bg-[rgb(var(--danger-rgb)/0.15)] text-(--danger)",
  accent: "bg-[rgb(var(--accent-rgb)/0.15)] text-(--accent)",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-(--radius-full) px-2.5 py-1 text-[12px] font-medium",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
