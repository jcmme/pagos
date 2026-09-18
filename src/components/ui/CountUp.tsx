"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Una cifra que sube desde cero al cargar. Solo vale la pena en las dos o tres
// cantidades que uno viene a ver: si todos los números de la app se animaran,
// dejaría de leerse como énfasis y empezaría a leerse como lentitud.
const DURATION = 700;

// La misma curva del resto de la app, escrita a mano porque aquí el valor se
// interpola en JavaScript y no en CSS.
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({ value, className }: { value: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  // null significa "enseña el valor de verdad". Así el HTML del servidor y el
  // primer render del cliente coinciden, no hay desajuste de hidratación, y si
  // el JavaScript nunca corre la cifra correcta ya está en pantalla.
  const [shown, setShown] = useState<number | null>(null);
  const frame = useRef<number>(undefined);

  useEffect(() => {
    if (reducedMotion) return;

    const start = performance.now();
    // El primer setState ocurre dentro del primer fotograma, no en el cuerpo
    // del efecto: hacerlo aquí encadenaría renders.
    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      setShown(progress < 1 ? value * easeOut(progress) : null);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [value, reducedMotion]);

  return <span className={className}>{formatCurrency(shown ?? value)}</span>;
}
