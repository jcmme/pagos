import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = pct >= 100 ? "bg-(--danger)" : pct >= 80 ? "bg-(--warning)" : "bg-(--accent)";

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-(--radius-full) bg-(--surface-3)", className)}>
      <div
        className={cn("h-full rounded-(--radius-full) transition-all", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
