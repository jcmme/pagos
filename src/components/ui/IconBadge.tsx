import type { LucideIcon } from "lucide-react";
import { ICON, type IconSize } from "@/lib/icons";
import { cn } from "@/lib/utils";

// El círculo con un icono dentro. Estaba copiado a mano en cinco sitios con
// cinco diámetros distintos —las píldoras del Resumen, el menú "Más", los
// resultados de búsqueda, el selector de categorías y el de iconos—, así que
// ninguno se parecía del todo a los demás.
//
// Se dibuja al montarse con las mismas clases que los iconos de categoría
// (.glyph-ring y .glyph-mark en globals.css), de modo que todo lo que lleva
// un icono en círculo aparece igual en toda la app.

const BOX: Record<IconSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

/**
 * `color` pinta el círculo con un color arbitrario (el de una categoría o una
 * cuenta) y el icono en negro translúcido; `surface` lo deja discreto sobre
 * el fondo de la tarjeta; `accent` es el círculo azul de acción.
 */
type Tone = "color" | "surface" | "accent";

export function IconBadge({
  icon: Icon,
  tone = "color",
  color,
  size = "md",
  index = 0,
  animate = true,
  className,
  children,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  /** Solo con tone="color". */
  color?: string;
  size?: IconSize;
  /** Posición en la lista, para que no se dibujen todos a la vez. */
  index?: number;
  animate?: boolean;
  className?: string;
  /** Lo que va dentro si no hay icono: normalmente una inicial. */
  children?: React.ReactNode;
}) {
  // Más allá del décimo el retraso deja de leerse como cascada y empieza a
  // leerse como lentitud.
  const delay = `${Math.min(index, 9) * 45}ms`;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        BOX[size],
        tone === "color" && "text-black/80",
        tone === "surface" && "bg-(--surface-3) text-(--accent)",
        tone === "accent" && "bg-(--accent) text-white",
        animate && "glyph-ring",
        className
      )}
      style={{
        background: tone === "color" ? color : undefined,
        animationDelay: animate ? delay : undefined,
      }}
    >
      {Icon ? (
        <Icon
          size={ICON[size]}
          className={cn(animate && "glyph-mark")}
          style={animate ? { animationDelay: `calc(${delay} + 0.1s)` } : undefined}
        />
      ) : (
        children
      )}
    </span>
  );
}
