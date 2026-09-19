import { CATEGORY_ICONS, type CategoryIconName } from "@/lib/category-icons";
import { IconBadge } from "./IconBadge";
import type { IconSize } from "@/lib/icons";

// El círculo de color de una categoría. Sin icono guardado se ve la inicial:
// nada se rompe si una categoría no tiene uno, y para un nombre propio como
// "Loreto" la inicial es de hecho mejor que cualquier dibujo.
//
// El dibujo lo pone IconBadge; aquí solo se resuelve qué icono toca.

const INITIAL_SIZE: Record<IconSize, string> = {
  sm: "text-[12px]",
  md: "text-[15px]",
  lg: "text-[19px]",
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
  size?: IconSize;
  index?: number;
  animate?: boolean;
  className?: string;
}) {
  // Acceso directo al mapa y no una función que lo resuelva: el compilador de
  // React no puede probar que una llamada devuelva siempre el mismo componente
  // y lo trata como un componente creado durante el render.
  const Icon = icon ? CATEGORY_ICONS[icon as CategoryIconName] : undefined;

  return (
    <IconBadge
      icon={Icon}
      color={color}
      size={size}
      index={index}
      animate={animate}
      className={Icon ? className : `${INITIAL_SIZE[size]} ${className ?? ""}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </IconBadge>
  );
}
