/**
 * El esqueleto que se pinta mientras la pantalla siguiente llega.
 *
 * Hace dos cosas, y la segunda importa más que la primera.
 *
 * La visible: al tocar una pestaña aparece algo **de inmediato** en vez de
 * quedarse la pantalla anterior congelada esperando al servidor. Es la
 * diferencia entre "no responde" y "ya voy", y es lo que separa una app que se
 * siente nativa de una que se siente una página web.
 *
 * La invisible, y la que de verdad acelera: Next no prefetchea una ruta
 * dinámica **si no tiene un límite de carga**. Está en su documentación
 * (`prefetching.md`): "a dynamic route is skipped unless it has a `loading.js`
 * boundary". Las trece pantallas de la app son `force-dynamic`, así que sin
 * este archivo el dock no descargaba absolutamente nada por adelantado y cada
 * toque era un viaje completo. Con él, el trozo hasta este límite viaja antes
 * de que toques.
 *
 * Va en el grupo `(app)` y no en cada carpeta a propósito: un solo archivo
 * cubre las trece rutas, y trece esqueletos a medida serían trece cosas que se
 * desincronizan con su pantalla en cuanto alguien toque una.
 */

// Las formas imitan el esqueleto común a casi todas las pantallas: un título y
// una pila de tarjetas. No intenta adivinar el contenido de cada una —eso se
// nota falso y se rompe—, solo reserva el sitio para que nada salte cuando los
// datos lleguen.
function Bar({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`rounded-(--radius-sm) bg-(--surface-2) ${className}`} style={style} />
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-(--radius-lg) border border-(--border) bg-(--surface) p-5">
      <Bar className="mb-4 h-[15px] w-28" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            {/* Los anchos bajan por fila: una columna de barras idénticas se
                lee como una tabla vacía, no como contenido en camino. */}
            <Bar className="h-[13px]" style={{ width: `${58 - i * 9}%` }} />
            <Bar className="h-[13px] w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    // `pulse-soft` late en lugar de parpadear: una opacidad que sube y baja
    // poco dice "esto está vivo y viene en camino" sin llamar la atención. Con
    // movimiento reducido el apagado global de globals.css lo deja quieto, y
    // el esqueleto sigue haciendo su trabajo.
    <div className="skeleton flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <Bar className="h-[26px] w-40" />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
