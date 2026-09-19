"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { ICON } from "@/lib/icons";
import { CategoryGlyph } from "@/components/ui/CategoryGlyph";
import { IconBadge } from "@/components/ui/IconBadge";
import { NAV_ITEMS } from "./nav";
import { searchEverything, type SearchHit } from "@/modules/search/actions";

// El contenido del buscador. No se posiciona ni decide cuándo se ve: de eso
// se encarga el Dock, que es quien se transforma para mostrarlo. Separarlo es
// lo que permite que el menú y el buscador sean el mismo objeto.
export function SearchPanel({ onClose }: { onClose: () => void }) {
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
  const sections =
    term.length >= 2
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

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Search size={ICON.md} className="shrink-0 text-(--foreground-subtle)" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca un movimiento o una sección"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-(--foreground-subtle)"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--surface-3) text-(--foreground-muted)"
        >
          <X size={ICON.sm} />
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

          {sections.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              className="pressable flex w-full items-center gap-2.5 rounded-(--radius-md) p-2 text-left hover:bg-(--surface-2)"
            >
              <IconBadge icon={item.icon} tone="surface" size="sm" animate={false} />
              <span className="flex-1 text-[14px]">{item.label}</span>
              <ArrowRight size={ICON.sm} className="text-(--foreground-subtle)" />
            </button>
          ))}
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
          onClick={onClose}
          className="border-t border-(--border) px-3 py-2.5 text-center text-[13px] text-(--accent)"
        >
          Ver todos los movimientos
        </Link>
      )}
    </div>
  );
}
