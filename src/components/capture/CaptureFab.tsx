"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { QuickCaptureData } from "@/modules/transactions/quick-data";
import { CaptureSheet } from "./CaptureSheet";

// Registrar un gasto es lo que se hace varias veces al día; todo lo demás se
// consulta. Por eso vive en un botón fijo, alcanzable desde cualquier pantalla
// y sin pasar por el menú.
export function CaptureFab({ data }: { data: QuickCaptureData }) {
  const [open, setOpen] = useState(false);
  // Cambia en cada apertura para remontar la hoja y que empiece en blanco.
  const [session, setSession] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSession((value) => value + 1);
          setOpen(true);
        }}
        aria-label="Registrar movimiento"
        className={[
          // Por encima de la tab bar (z-40) y por debajo del modal (z-50).
          "fixed right-5 z-45 flex h-14 w-14 items-center justify-center rounded-full",
          // En móvil se apoya sobre la tab bar; en escritorio no hay tab bar.
          "bottom-20 md:bottom-8 md:right-8",
          "bg-(--accent) text-white shadow-lg shadow-black/40",
          "transition-transform active:scale-95",
        ].join(" ")}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <CaptureSheet
        key={session}
        open={open}
        onClose={() => setOpen(false)}
        data={data}
      />
    </>
  );
}
