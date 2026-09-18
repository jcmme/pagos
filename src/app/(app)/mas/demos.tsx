// Miniaturas que explican cada función del menú "Más" en un segundo.
//
// Son seis primitivas reusadas en nueve funciones, no nueve dibujos distintos:
// nueve animaciones a medida serían imposibles de mantener y, peor, se verían
// como nueve estilos diferentes.
//
// Ninguna tiene estado ni temporizador. La reproducción la dispara el
// data-play="true" que pone el contenedor de la fila, y los @keyframes viven
// en globals.css. En reposo cada miniatura se ve en su estado final, así que
// una fila que nunca entró en pantalla sigue siendo legible.

const BOX = "flex h-[46px] w-[76px] shrink-0 flex-col justify-center gap-1 rounded-(--radius-sm) bg-(--surface-2) p-2";

/** Una barra que se llena hasta cierto punto: presupuesto, meta, deuda. */
function BarFill({ to, color }: { to: string; color: string }) {
  return (
    <div className={BOX}>
      <div className="h-1.5 w-full overflow-hidden rounded-(--radius-full) bg-(--surface-3)">
        <div
          className="demo-bar h-full rounded-(--radius-full)"
          style={{ width: to, ["--to" as string]: to, background: color }}
        />
      </div>
      <div className="h-1 w-2/3 rounded-(--radius-full) bg-(--surface-3)" />
    </div>
  );
}

/**
 * Tres renglones que entran escalonados: una lista que se llena sola. El tono
 * distingue los dos usos, que si no se verían idénticos en el menú.
 */
function RowsIn({ color }: { color: string }) {
  return (
    <div className={BOX}>
      {[1, 2, 3].map((row) => (
        <div
          key={row}
          className={`demo-row demo-row-${row} flex items-center gap-1.5`}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <span
            className="h-1 rounded-(--radius-full) bg-(--surface-3)"
            style={{ width: `${70 - row * 12}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Un saldo que sube. Las tres cifras están apiladas y se cruzan por opacidad. */
function BalanceCount() {
  return (
    <div className={BOX}>
      <div className="relative h-3">
        {["$0", "$9,480", "$12,651"].map((amount, index) => (
          <span
            key={amount}
            className={`demo-num demo-num-${"abc"[index]} absolute inset-0 text-[11px] font-semibold leading-3 tabular-nums text-(--success)`}
          >
            {amount}
          </span>
        ))}
      </div>
      <div className="h-1 w-1/2 rounded-(--radius-full) bg-(--surface-3)" />
    </div>
  );
}

/** Un renglón que se abre y revela dos hijos indentados. */
function TreeOpen() {
  return (
    <div className={BOX}>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-(--purple)" />
        <span className="h-1 w-8 rounded-(--radius-full) bg-(--surface-3)" />
      </div>
      {[1, 2].map((child) => (
        <div
          key={child}
          className={`demo-child demo-child-${child} flex items-center gap-1.5 pl-2.5`}
        >
          <span className="h-1 w-1 rounded-full bg-(--accent)" />
          <span
            className="h-1 rounded-(--radius-full) bg-(--surface-3)"
            style={{ width: child === 1 ? "28px" : "20px" }}
          />
        </div>
      ))}
    </div>
  );
}

/** Una etiqueta que vuela desde la derecha y se posa sobre el renglón. */
function TagApply() {
  return (
    <div className={BOX}>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-7 rounded-(--radius-full) bg-(--surface-3)" />
        <span className="demo-tag h-2 w-6 rounded-(--radius-full) bg-(--warning)" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-5 rounded-(--radius-full) bg-(--surface-3)" />
        <span className="h-1 w-3 rounded-(--radius-full) bg-(--surface-3)" />
      </div>
    </div>
  );
}

/** Dos interruptores que se encienden. */
function Toggles() {
  return (
    <div className={BOX}>
      {[1, 2].map((toggle) => (
        <div key={toggle} className="flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-(--radius-full) bg-(--surface-3)" />
          <span
            className={`demo-switch demo-switch-${toggle} flex h-2.5 w-5 items-center rounded-(--radius-full) bg-(--surface-3) p-0.5`}
          >
            <span
              className={`demo-knob demo-knob-${toggle} h-1.5 w-1.5 rounded-full bg-white`}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

// La miniatura y la descripción de cada sección, indexadas por su ruta.
export const DEMOS: Record<string, { detail: string; demo: React.ReactNode }> = {
  "/cuentas": {
    detail: "Tu saldo real por cuenta y el corte de cada tarjeta",
    demo: <BalanceCount />,
  },
  "/pagos": {
    detail: "Lo que se repite cada mes y cuándo toca pagarlo",
    demo: <RowsIn color="var(--accent)" />,
  },
  "/presupuestos": {
    detail: "Un límite por categoría y cuánto llevas del mes",
    demo: <BarFill to="82%" color="var(--warning)" />,
  },
  "/metas": {
    detail: "Cuánto te falta ahorrar y cuánto apartar al mes",
    demo: <BarFill to="64%" color="var(--success)" />,
  },
  "/deudas": {
    detail: "Lo que debes y lo que te deben, abono por abono",
    demo: <BarFill to="45%" color="var(--danger)" />,
  },
  "/suscripciones": {
    detail: "Cargos que se repiten, y aviso si suben de precio",
    demo: <RowsIn color="var(--purple)" />,
  },
  "/categorias": {
    detail: "Tus categorías y subcategorías, hasta tres niveles",
    demo: <TreeOpen />,
  },
  "/reglas": {
    detail: "Clasifica solas tus compras por el nombre del comercio",
    demo: <TagApply />,
  },
  "/ajustes": {
    detail: "Tu contraseña y las cuentas de la casa",
    demo: <Toggles />,
  },
};
