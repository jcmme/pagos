"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON } from "@/lib/icons";
import { CaptureSheet } from "@/components/capture/CaptureSheet";
import type { QuickCaptureData } from "@/modules/transactions/quick-data";
import { NAV_ITEMS, PRIMARY_HREFS } from "./nav";
import { SearchPanel } from "./SearchPanel";
import { createQuickTransaction } from "@/modules/transactions/actions";
import { Button } from "@/components/ui/Button";

// Una sola cosa flotando abajo.
//
// Antes eran tres —la barra de secciones pegada al borde, el botón + a la
// derecha y la píldora de búsqueda al centro— y las tres se disputaban la
// misma franja. Ahora el menú, el botón de capturar y el buscador son el
// mismo objeto: la lupa no es una sexta pestaña, es el tirador que hace que
// la pastilla se transforme en el panel de búsqueda.

const MOBILE_ITEMS = [
  ...NAV_ITEMS.filter((item) => PRIMARY_HREFS.includes(item.href)),
  { href: "/mas", label: "Más", icon: MoreHorizontal },
];

// Dos a cada lado del botón de capturar, que va al centro.
const HALF = Math.ceil(MOBILE_ITEMS.length / 2);

export function Dock({ data }: { data: QuickCaptureData }) {
  const pathname = usePathname();
  const [searching, setSearching] = useState(false);
  const [capturing, setCapturing] = useState(false);
  // Un guardado que no salió, con su formulario intacto para reintentar.
  //
  // Cerrar la hoja antes de que el servidor conteste solo es honesto si el
  // fallo se ve. Aquí se ve, y con los datos guardados: reintentar manda
  // exactamente lo mismo, así que adelantar el cierre no puede costar una
  // captura.
  const [failed, setFailed] = useState<{ data: FormData; error: string } | null>(null);
  // Cambia en cada apertura para remontar la hoja y que empiece en blanco.
  const [session, setSession] = useState(0);

  // El guardado vive aquí y no en la hoja a propósito: la hoja se desmonta al
  // cerrarse (el Modal devuelve null), así que si la petición viviera dentro,
  // cerrar antes de tiempo se llevaría por delante su resultado. El dock no se
  // desmonta nunca.
  async function save(formData: FormData) {
    setCapturing(false);
    const result = await createQuickTransaction({ error: null }, formData);
    if (result.error) setFailed({ data: formData, error: result.error });
  }

  useEffect(() => {
    if (!searching) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearching(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searching]);

  function isActive(href: string) {
    return (
      pathname === href ||
      // "Más" se enciende en cualquier ruta que no sea una de las del dock.
      (href === "/mas" && !MOBILE_ITEMS.some((item) => item.href === pathname))
    );
  }

  function openCapture() {
    setSession((value) => value + 1);
    setCapturing(true);
  }

  // La etiqueta solo aparece bajo la sección activa. Con las cuatro puestas,
  // "Resumen" y "Movimientos" se encimaban: no caben cuatro palabras en
  // español, el botón de capturar y el tirador en el ancho de un teléfono.
  // Así se conserva la orientación sin apretar nada.
  const tab = (item: (typeof MOBILE_ITEMS)[number]) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "pressable flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-(--radius-md) py-1.5",
          active ? "text-(--accent)" : "text-(--foreground-subtle)"
        )}
      >
        <Icon size={ICON.md} />
        {active && (
          <span className="animate-fade max-w-full truncate text-[10px] leading-none">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {searching && (
        // Velo tenue y sin bloquear el scroll: el buscador no es un modal,
        // pero tocar fuera tiene que cerrarlo.
        <button
          type="button"
          aria-label="Cerrar búsqueda"
          onClick={() => setSearching(false)}
          className="animate-fade fixed inset-0 z-45 bg-black/40 md:bg-black/20"
        />
      )}

      <div
        className={cn(
          "glass-dock fixed z-46 overflow-hidden shadow-lg shadow-black/40",
          "transition-all duration-(--dur-slow) ease-(--ease-out)",
          searching
            ? "left-4 right-4 rounded-(--radius-lg) md:left-1/2 md:right-auto md:w-[520px] md:-translate-x-1/2"
            : [
                "left-4 right-4 rounded-(--radius-full)",
                // En escritorio el sidebar ya lista las trece secciones, así
                // que el dock se encoge a lo único que no está ahí: buscar y
                // capturar.
                "md:left-auto md:right-8 md:w-auto",
              ].join(" ")
        )}
        style={{
          bottom: "var(--dock-bottom)",
          // Ver el comentario de .glass-dock: en la hoja compilada esta
          // propiedad no sobrevive, y sin ella el cristal es un fondo opaco.
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
        }}
      >
        {searching ? (
          <SearchPanel onClose={() => setSearching(false)} />
        ) : (
          <div className="flex items-center gap-1 px-2 py-1.5">
            <div className="flex flex-1 items-center md:hidden">
              {MOBILE_ITEMS.slice(0, HALF).map(tab)}
            </div>

            <button
              type="button"
              onClick={openCapture}
              aria-label="Registrar movimiento"
              className="pressable mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--accent) text-white"
            >
              <Plus size={ICON.lg} />
            </button>

            <div className="flex flex-1 items-center md:hidden">
              {MOBILE_ITEMS.slice(HALF).map(tab)}
            </div>

            {/* La línea separa el tirador de las secciones: deja claro que no
                es una pestaña más. */}
            <span className="mx-1 h-7 w-px shrink-0 bg-(--border) md:hidden" />

            <button
              type="button"
              onClick={() => setSearching(true)}
              aria-label="Buscar"
              className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--foreground-subtle)"
            >
              <Search size={ICON.md} />
            </button>
          </div>
        )}
      </div>

      <CaptureSheet
        key={session}
        open={capturing}
        onClose={() => setCapturing(false)}
        onSubmit={save}
        data={data}
      />

      {failed && (
        <div
          role="alert"
          className="glass fixed inset-x-4 z-50 flex items-center gap-3 rounded-(--radius-md) border border-[rgb(var(--danger-rgb)/0.3)] p-3"
          style={{ bottom: "calc(var(--dock-height, 72px) + 12px)" }}
        >
          <span className="min-w-0 flex-1 text-[13px] text-(--foreground)">
            No se guardó: {failed.error}
          </span>
          <Button
            variant="secondary"
            className="shrink-0 px-3 py-1.5 text-[13px]"
            onClick={() => {
              const retry = failed.data;
              setFailed(null);
              save(retry);
            }}
          >
            Reintentar
          </Button>
        </div>
      )}
    </>
  );
}
