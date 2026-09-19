"use client";

import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Button } from "./Button";

// Deslizar en vez de tocar para la última confirmación. No es adorno: un botón
// en esa posición se pulsa sin querer con el pulgar, y este gesto es justo lo
// que hace que guardar un gasto se sienta deliberado.
//
// Con pointer events y setPointerCapture, que es lo que mantiene el arrastre
// cuando el dedo se sale del riel. Es el único gesto escrito a mano de todo el
// rediseño; lo demás es scroll-snap del navegador.

const THUMB = 52;
const PADDING = 4;
// Menos de esto es un toque torpe, no una intención de confirmar.
const COMMIT = 0.75;

export function SwipeToConfirm({
  label,
  confirmingLabel,
  onConfirm,
  disabled,
  pending,
}: {
  label: string;
  confirmingLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  // El recorrido se mide al empezar el gesto y se guarda: leer el ancho del
  // riel durante el render sería acceder al DOM cuando React aún no garantiza
  // que esté puesto.
  const [travel, setTravel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = useReducedMotion();

  // Quien pide menos movimiento en su sistema no debería tener que arrastrar
  // nada: ahí esto es un botón normal y corriente.
  if (reducedMotion) {
    return (
      <Button type="button" disabled={disabled || pending} onClick={onConfirm}>
        <span className="flex items-center justify-center gap-1.5">
          <Check size={16} />
          {pending ? confirmingLabel : label}
        </span>
      </Button>
    );
  }

  // El gesto se sigue en la ventana y no en el propio botón. setPointerCapture
  // parecía lo indicado, pero no todos los navegadores lo conceden y, cuando
  // falla, el arrastre se corta en cuanto el dedo se sale del pulgar: quedaría
  // a medio camino sin que nada lo explique.
  function start(event: ReactPointerEvent<HTMLButtonElement>) {
    const rail = event.currentTarget.parentElement as HTMLElement;
    const box = rail.getBoundingClientRect();
    const distance = Math.max(1, rail.clientWidth - THUMB - PADDING * 2);

    setTravel(distance);
    setDragging(true);

    // La posición se lleva también en una variable local: al soltar hay que
    // decidir con el último valor real, no con el que el estado alcanzó a
    // propagar.
    let current = 0;

    const onMove = (moveEvent: PointerEvent) => {
      current = Math.max(
        0,
        Math.min(distance, moveEvent.clientX - box.left - THUMB / 2)
      );
      setOffset(current);
    };

    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setDragging(false);

      if (current / distance >= COMMIT) {
        // Se deja hasta el final para que el pulgar vea que llegó, y ahí se
        // confirma.
        setOffset(distance);
        onConfirm();
      } else {
        setOffset(0);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    onMove(event.nativeEvent);
  }

  const progress = travel > 0 ? offset / travel : 0;
  const glide = dragging ? "none" : "var(--dur) var(--ease-out)";

  return (
    <div
      className={cn(
        "relative h-14 select-none overflow-hidden rounded-(--radius-full) bg-(--surface-2)",
        (disabled || pending) && "pointer-events-none opacity-40"
      )}
    >
      <div
        className="absolute inset-y-0 left-0 bg-(--accent)/25"
        style={{ width: `${offset + THUMB}px`, transition: `width ${glide}` }}
      />

      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 text-center text-[14px] font-medium"
        // Se desvanece antes de llegar al final para no quedar debajo del
        // pulgar justo cuando hay que leer que ya se confirmó.
        style={{ opacity: Math.max(0, 1 - progress * 1.6) }}
      >
        {pending ? confirmingLabel : label}
      </span>

      <button
        type="button"
        aria-label={label}
        onPointerDown={start}
        // El teclado no arrastra: para quien navegue con tabulador, Enter
        // confirma directo.
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onConfirm();
          }
        }}
        className="absolute flex items-center justify-center rounded-(--radius-full) bg-(--accent) text-white"
        style={{
          top: PADDING,
          left: PADDING,
          height: 56 - PADDING * 2,
          width: THUMB,
          transform: `translateX(${offset}px)`,
          transition: `transform ${glide}`,
          touchAction: "none",
        }}
      >
        {progress >= COMMIT ? <Check size={20} /> : <ArrowRight size={20} />}
      </button>
    </div>
  );
}
