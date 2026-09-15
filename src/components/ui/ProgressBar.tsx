import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  /**
   * "limit" (por defecto): llenar la barra es malo, como en un presupuesto.
   * "goal": llenar la barra es bueno, como en un score o una meta de ahorro.
   */
  semantics?: "limit" | "goal";
}

export function ProgressBar({ value, max, className, semantics = "limit" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  const tone =
    semantics === "goal"
      ? pct >= 70
        ? "bg-(--success)"
        : pct >= 40
          ? "bg-(--warning)"
          : "bg-(--danger)"
      : pct >= 100
        ? "bg-(--danger)"
        : pct >= 80
          ? "bg-(--warning)"
          : "bg-(--accent)";

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-(--radius-full) bg-(--surface-3)", className)}>
      <div
        className={cn("h-full rounded-(--radius-full) transition-all", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
