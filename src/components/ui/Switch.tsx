import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// El interruptor de iOS: una pastilla con un botón que se desliza de un lado al
// otro. Encendido o apagado, nunca los dos.
//
// Por dentro sigue siendo un <input type="checkbox">, y eso no es un detalle:
// así viaja solo en un formulario, lo entiende el teclado y los lectores de
// pantalla lo anuncian como interruptor sin una línea de JavaScript. Todo el
// dibujo vive en .ios-switch, en globals.css.
export function Switch({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input type="checkbox" role="switch" className={cn("ios-switch", className)} {...props} />
  );
}

/**
 * La fila completa: el texto a la izquierda y el interruptor a la derecha, como
 * en los ajustes del teléfono. El texto es parte de la etiqueta, así que tocar
 * cualquier parte de la fila lo acciona.
 */
export function SwitchRow({
  label,
  hint,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 text-[14px]",
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-(--foreground)">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[12px] text-(--foreground-subtle)">
            {hint}
          </span>
        )}
      </span>
      <Switch {...props} />
    </label>
  );
}
