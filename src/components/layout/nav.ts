import {
  LayoutGrid,
  ArrowLeftRight,
  CalendarClock,
  HandCoins,
  PiggyBank,
  Tags,
  Wallet,
  HeartPulse,
  Upload,
  Target,
  Repeat,
  Filter,
} from "lucide-react";

// Vive en su propio módulo (sin "use client") porque lo consumen tanto el
// AppShell, que es cliente, como la página /mas, que es servidor: importarlo
// desde el módulo cliente le entregaría al servidor un proxy en vez del array.
export const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/salud", label: "Salud", icon: HeartPulse },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/pagos", label: "Pagos fijos", icon: CalendarClock },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/deudas", label: "Deudas", icon: HandCoins },
  { href: "/suscripciones", label: "Suscripciones", icon: Repeat },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/reglas", label: "Reglas", icon: Filter },
];

// Las secciones de uso diario, que son las que caben en la barra inferior.
export const PRIMARY_HREFS = ["/", "/movimientos", "/importar", "/salud"];
