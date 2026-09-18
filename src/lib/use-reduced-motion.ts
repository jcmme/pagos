"use client";

import { useSyncExternalStore } from "react";

// Casi todo el movimiento de la app se apaga desde CSS, con la media query en
// globals.css. Este hook es para lo que CSS no alcanza: los contadores que se
// interpolan en JavaScript y las gráficas de recharts, que traen su propio
// motor de animación y no consultan la preferencia del sistema.
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // En el servidor no hay preferencia que leer. Se asume que sí hay
    // movimiento y el cliente corrige en el primer render si hace falta.
    () => false
  );
}
