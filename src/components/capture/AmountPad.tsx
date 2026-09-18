"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { appendKey } from "@/modules/transactions/expression";

// La retícula de una calculadora de toda la vida: dígitos a la izquierda,
// operadores en la última columna. Las reglas de escritura viven en
// expression.ts; aquí solo se dibujan las teclas.
const KEYS = [
  "7", "8", "9", "/",
  "4", "5", "6", "*",
  "1", "2", "3", "-",
  ".", "0", "back", "+",
];

// En pantalla los operadores se ven como signos de verdad, no como los
// caracteres con los que se guardan.
const LABELS: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "-": "−",
  "+": "+",
};

const NAMES: Record<string, string> = {
  "*": "Multiplicar",
  "/": "Dividir",
  "-": "Restar",
  "+": "Sumar",
  ".": "Punto decimal",
  back: "Borrar",
};

// Teclado grande en lugar de un <input> chico: capturar un gasto es sobre todo
// teclear un número, y en el teléfono eso se hace con el pulgar.
export function AmountPad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {KEYS.map((key) => {
        const isOperator = key in LABELS;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(appendKey(value, key))}
            className={cn(
              "pressable flex h-14 items-center justify-center rounded-(--radius-md)",
              "text-[22px] font-medium transition-colors",
              isOperator
                ? "bg-(--surface-3) text-(--accent) active:bg-(--surface-2)"
                : "bg-(--surface-2) text-(--foreground) active:bg-(--surface-3)"
            )}
            aria-label={NAMES[key] ?? key}
          >
            {key === "back" ? <Delete size={20} /> : (LABELS[key] ?? key)}
          </button>
        );
      })}
    </div>
  );
}
