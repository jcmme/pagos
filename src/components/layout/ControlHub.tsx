"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryGlyph } from "@/components/ui/CategoryGlyph";
import { NAV_ITEMS } from "./nav";
import { searchEverything, type SearchHit } from "@/modules/search/actions";

// Una isla: en reposo es una píldora corta y centrada, y al tocarla crece a
// todo el ancho con los resultados dentro. No es un modal —no tapa la app ni
// bloquea el scroll— porque buscar algo suele ser para ir a otro lado, no para
// detenerse.
//
// Capas: barra inferior z-40, botón + z-45, isla z-46, Modal z-50. La isla va
// encima del botón porque al abrirse ocupa su sitio, y debajo del Modal para
// no asomar sobre una hoja abierta.

export function ControlHub({ onExpandedChange }: { onExpandedChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Los resultados guardan de qué término son: así, al seguir tecleando, se
  // descartan solos sin tener que borrarlos desde un efecto.
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] }>({
    term: "",
    hits: [],
  });
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Las secciones se filtran en el cliente: son trece cadenas y no vale la
  // pena un viaje al servidor para eso.
  const term = query.trim().toLowerCase();
  const sections = term.length >= 2
    ? NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 4)
    : [];

  const hits = result.term === term ? result.hits : [];

  useEffect(() => {
    if (term.length < 2) return;
    // Se espera a que deje de teclear: sin esto, "colegiatura" son once
    // consultas.
    const timer = setTimeout(() => {
      startTransition(async () =>
        setResult({ term, hits: await searchEverything(term) })
      );
    }, 220);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    // El cierre se escribe aquí en vez de llamar a close(): una función
    // redefinida en cada render obligaría a volver a suscribir el teclado.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setQuery("");
      onExpandedChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onExpandedChange]);

  function expand(next: boolean) {
    setOpen(next);
    // Se avisa aquí y no desde un efecto: el padre retira el botón + en el
    // mismo render en que la isla crece, sin un fotograma con los dos encima.
    onExpandedChange(next);
  }

  function close() {
    expand(false);
    setQuery("");
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  return (
    <>
      {/* Un velo tenue y sin bloquear el scroll: la isla no es un modal, pero
          tocar fuera tiene que cerrarla. */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar búsqueda"
          onClick={close}
          className="animate-fade fixed inset-0 z-46 bg-black/40 md:bg-black/20"
        />
      )}

      <div
        className={cn(
          "glass fixed z-46 overflow-hidden transition-all duration-300 ease-(--ease-out)",
          open
            ? "bottom-4 left-4 right-4 rounded-(--radius-lg) md:left-1/2 md:w-[520px] md:-translate-x-1/2"
            : // En reposo es angosta y centrada, así que ni se acerca al botón
              // + de la esquina derecha.
              "bottom-20 left-1/2 w-40 -translate-x-1/2 rounded-(--radius-full) md:bottom-8"
        )}
      >
        {open ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Search size={17} className="shrink-0 text-(--foreground-subtle)" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca un movimiento o una sección"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-(--foreground-subtle)"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--surface-3) text-(--foreground-muted)"
              >
                <X size={14} />
              </button>
            </div>

            {(hits.length > 0 || sections.length > 0) && (
              <div className="max-h-[46vh] overflow-y-auto border-t border-(--border) p-1.5">
                {hits.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => go(hit.href)}
                    className="pressable flex w-full items-center gap-2.5 rounded-(--radius-md) p-2 text-left hover:bg-(--surface-2)"
                  >
                    <CategoryGlyph
                      name={hit.title}
                      color={hit.color ?? "#6e6e73"}
                      icon={hit.icon}
                      size="sm"
                      animate={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px]">{hit.title}</span>
                      <span className="block truncate text-[12px] text-(--foreground-muted)">
                        {hit.detail}
                      </span>
                    </span>
                  </button>
                ))}

                {sections.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => go(item.href)}
                      className="pressable flex w-full items-center gap-2.5 rounded-(--radius-md) p-2 text-left hover:bg-(--surface-2)"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--surface-3)">
                        <Icon size={14} className="text-(--accent)" />
                      </span>
                      <span className="flex-1 text-[14px]">{item.label}</span>
                      <ArrowRight size={14} className="text-(--foreground-subtle)" />
                    </button>
                  );
                })}
              </div>
            )}

            {term.length >= 2 && hits.length === 0 && sections.length === 0 && (
              <p className="border-t border-(--border) px-3 py-4 text-center text-[13px] text-(--foreground-muted)">
                Nada con “{query.trim()}”.
              </p>
            )}

            {hits.length > 0 && (
              <Link
                href={`/movimientos?q=${encodeURIComponent(term)}`}
                onClick={close}
                className="border-t border-(--border) px-3 py-2.5 text-center text-[13px] text-(--accent)"
              >
                Ver todos los movimientos
              </Link>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => expand(true)}
            className="pressable flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] text-(--foreground-muted)"
          >
            <Search size={15} />
            Buscar
          </button>
        )}
      </div>
    </>
  );
}
