import { CATEGORY_ICONS, type CategoryIconName } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

// El círculo de color de una categoría con su icono dentro. Sin icono guardado
// se ve la inicial, que es como se veía antes: nada se rompe si una categoría
// no tiene uno, y para un nombre propio como "Loreto" la inicial es de hecho
// mejor que cualquier dibujo.
//
// La animación corre al montarse (ver .glyph-ring y .glyph-mark en
// globals.css), así que se dibuja justo cuando la categoría aparece en
// pantalla y nunca más.

const SIZES = {
  sm: { box: "h-7 w-7 text-[12px]", icon: 14 },
  md: { box: "h-9 w-9 text-[15px]", icon: 18 },
  lg: { box: "h-12 w-12 text-[19px]", icon: 24 },
};

export function CategoryGlyph({
  name,
  color,
  icon,
  size = "md",
  index = 0,
  animate = true,
  className,
}: {
  name: string;
  color: string;
  icon?: string | null;
  size?: keyof typeof SIZES;
  /** Posición en la lista, para que no se dibujen todos a la vez. */
  index?: number;
  animate?: boolean;
  className?: string;
}) {
  // Acceso directo al mapa y no una función que lo resuelva: el compilador de
  // React no puede probar que una llamada devuelva siempre el mismo componente
  // y lo trata como un componente creado durante el render.
  const Icon = icon ? CATEGORY_ICONS[icon as CategoryIconName] : undefined;
  const { box, icon: iconSize } = SIZES[size];
  // Más allá del décimo el retraso deja de leerse como cascada y empieza a
  // leerse como lentitud.
  const delay = `${Math.min(index, 9) * 45}ms`;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-black/80",
        box,
        animate && "glyph-ring",
        className
      )}
      style={{ background: color, animationDelay: animate ? delay : undefined }}
    >
      {Icon ? (
        <Icon
          size={iconSize}
          strokeWidth={2.2}
          className={cn(animate && "glyph-mark")}
          style={animate ? { animationDelay: `calc(${delay} + 0.1s)` } : undefined}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
