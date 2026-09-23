import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Material translúcido sobre el ambiente, no un gris opaco: cada
        // tarjeta toma algo del color que tiene detrás. El borde superior más
        // claro es la luz dando en el canto, que es lo que hace que se lea
        // como una lámina y no como un rectángulo semitransparente.
        "rounded-(--radius-lg) border border-(--border) border-t-(--edge-light)",
        "bg-(--surface-glass) p-5 shadow-(--elevation-card)",
        // Encima del ambiente, que va en z-0.
        "relative z-1",
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
