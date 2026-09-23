import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "danger";

// El color al que va el icono cuando se toca o se apunta. En reposo todos
// parten del mismo gris: un renglón con tres acciones de colores distintos se
// lee como tres avisos, no como tres acciones.
const TONES: Record<Tone, string> = {
  neutral: "hover:text-(--foreground) active:text-(--foreground)",
  accent: "hover:text-(--accent) active:text-(--accent)",
  danger: "hover:text-(--danger) active:text-(--danger)",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  /** Obligatorio: el botón no lleva texto, así que sin esto no se puede usar
   *  con lector de pantalla ni se sabe qué hace al mantenerlo pulsado. */
  "aria-label": string;
}

/**
 * La acción de una fila: un icono sin texto.
 *
 * Existe porque había quince copiadas a mano por la app, todas con `p-1.5` y
 * un icono de 14 px, o sea **26×26 px de blanco de toque**: poco más de la
 * mitad de los 44 px que Apple pide, y con el pulgar eso se falla. El botón
 * mide ahora 44 aunque el icono siga siendo pequeño; el área crece, el dibujo
 * no.
 *
 * Y ninguna de las quince tenía respuesta al toque: solo `hover:`, que en una
 * pantalla táctil no existe. Tocabas y no pasaba nada hasta que la pantalla
 * cambiaba. `pressable` da el hundido en el momento del contacto, que es la
 * regla que sostiene todo lo demás: la respuesta va en el toque, no en el
 * resultado.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone = "neutral", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          // El área es de 44; el círculo que se pinta al tocar, de 32, porque
          // un halo de 44 en una fila estrecha se come el renglón.
          "pressable inline-flex h-11 w-11 shrink-0 items-center justify-center",
          "text-(--foreground-subtle) transition-colors",
          "before:absolute before:h-8 before:w-8 before:rounded-full before:transition-colors",
          "hover:before:bg-(--surface-2) active:before:bg-(--surface-3)",
          "relative [&>svg]:relative",
          TONES[tone],
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";
