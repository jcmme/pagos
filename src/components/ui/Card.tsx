import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-(--radius-lg) border border-(--border) bg-(--surface) p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[15px] font-medium text-(--foreground-muted)", className)}
      {...props}
    />
  );
}
