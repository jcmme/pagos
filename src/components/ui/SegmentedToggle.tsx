"use client";

import type { LucideIcon } from "lucide-react";
import { ICON } from "@/lib/icons";
import { cn } from "@/lib/utils";

// La pastilla de dos posiciones: una encendida, la otra apagada, nunca las dos.
//
// El indicador es un solo elemento que se desliza de un lado al otro en vez de
// dos fondos que se prenden y apagan. Eso es lo que hace que se lea como un
// interruptor físico y no como dos botones.
//
// Ya estaba escrito a mano en la hoja de captura para Gasto/Ingreso; vive aquí
// para que el interruptor del sueldo se vea exactamente igual.

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** El color del estado encendido. Por omisión, el acento. */
  tone?: string;
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Para lectores de pantalla: qué se está eligiendo. */
  label: string;
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const share = 100 / options.length;
  const tone = options[index]?.tone ?? "var(--accent)";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative flex rounded-(--radius-full) bg-(--surface-2) p-0.5",
        className
      )}
    >
      {/* El fondo que se desliza. Va detrás de las etiquetas y no captura
          toques: los botones siguen siendo los botones. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0.5 rounded-(--radius-full) transition-all duration-(--dur) ease-(--ease-out)"
        style={{
          left: `calc(${index * share}% + 2px)`,
          width: `calc(${share}% - 4px)`,
          background: `color-mix(in srgb, ${tone} 22%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 35%, transparent)`,
        }}
      />

      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            // min-w-0 no es decorativo: sin él un botón de flex no baja de su
            // ancho de contenido y la pastilla desborda la pantalla en vez de
            // apretarse.
            className={cn(
              "pressable relative z-1 flex min-w-0 flex-1 items-center justify-center gap-1.5",
              "rounded-(--radius-full) px-3 py-1.5 text-[13px] transition-colors"
            )}
            style={{
              color: active ? (option.tone ?? "var(--accent)") : "var(--foreground-muted)",
            }}
          >
            {Icon && <Icon size={ICON.sm} className="shrink-0" />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
