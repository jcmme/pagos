"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

// Teclado grande en lugar de un <input> chico: capturar un gasto es sobre todo
// teclear un número, y en el teléfono eso se hace con el pulgar.
export function AmountPad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  function press(key: string) {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : `${value}.`);
      return;
    }
    // Dos decimales bastan para pesos y evitan montos imposibles de leer.
    const [, decimals] = value.split(".");
    if (decimals !== undefined && decimals.length >= 2) return;
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className={cn(
            "flex h-14 items-center justify-center rounded-(--radius-md) bg-(--surface-2)",
            "text-[22px] font-medium text-(--foreground) transition-colors active:bg-(--surface-3)"
          )}
          aria-label={key === "back" ? "Borrar" : key}
        >
          {key === "back" ? <Delete size={20} /> : key}
        </button>
      ))}
    </div>
  );
}
