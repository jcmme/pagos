import { ButtonHTMLAttributes, ReactNode } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón circular con una burbuja de cuenta encima. Sirve para avisos, pero no
 * sabe nada de ellos: también vale para mensajes o pendientes.
 *
 * No se apoya en el Button compartido a propósito: ese es una pastilla con
 * padding horizontal, y aquí hace falta un círculo. Sigue el mismo patrón de
 * icono-círculo que MonthNav y el botón de cerrar del Modal.
 */

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; icon: number }> = {
  sm: { box: "h-8 w-8", icon: 16 },
  md: { box: "h-9 w-9", icon: 18 },
  lg: { box: "h-11 w-11", icon: 22 },
};

// A partir de dos dígitos la burbuja deja de ser un círculo y se come el
// icono. Un "9+" dice lo mismo sin deformarse.
const MAX_COUNT = 9;

interface NotificationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  count?: number;
  icon?: ReactNode;
  size?: Size;
  /** Qué se está contando, para el lector de pantalla: "3 avisos". */
  countLabel?: string;
}

export function NotificationButton({
  count = 0,
  icon,
  size = "md",
  countLabel = "avisos",
  className,
  ...props
}: NotificationButtonProps) {
  const { box, icon: iconSize } = SIZES[size];
  const hasCount = count > 0;

  return (
    <button
      type="button"
      // La cuenta va en la etiqueta porque la burbuja es puramente visual: sin
      // esto, un lector de pantalla solo anunciaría "avisos".
      aria-label={hasCount ? `${count} ${countLabel}` : `Sin ${countLabel}`}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-(--radius-full) transition-colors",
        box,
        hasCount ? "text-(--foreground)" : "text-(--foreground-muted)",
        "hover:bg-(--surface-2) hover:text-(--foreground) active:opacity-80",
        className
      )}
      {...props}
    >
      {icon ?? <Bell size={iconSize} strokeWidth={2} />}

      {hasCount && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-(--radius-full) bg-(--danger) px-1 text-[10px] font-semibold leading-none text-white"
        >
          {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
        </span>
      )}
    </button>
  );
}
