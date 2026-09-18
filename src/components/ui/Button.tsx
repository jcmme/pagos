import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-(--accent) text-white hover:bg-(--accent-hover) active:opacity-80",
  secondary:
    "bg-(--surface-2) text-(--foreground) hover:bg-(--surface-3) active:opacity-80",
  ghost: "bg-transparent text-(--accent) hover:bg-(--surface-2)",
  danger: "bg-(--danger)/15 text-(--danger) hover:bg-(--danger)/25",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "pressable inline-flex items-center justify-center gap-2 rounded-(--radius-full) px-4 py-2.5 text-[15px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none",
          VARIANTS[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
