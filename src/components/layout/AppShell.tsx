"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Receipt,
  CalendarClock,
  HandCoins,
  PiggyBank,
  Tags,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutGrid },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/pagos", label: "Pagos fijos", icon: CalendarClock },
  { href: "/deudas", label: "Deudas", icon: HandCoins },
  { href: "/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/categorias", label: "Categorías", icon: Tags },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-(--border) p-5 md:flex">
        <div className="mb-8 px-2 text-[20px] font-semibold tracking-tight">
          💰 Pagos
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-(--radius-md) px-3 py-2.5 text-[15px] transition-colors",
                  active
                    ? "bg-(--accent)/15 text-(--accent)"
                    : "text-(--foreground-muted) hover:bg-(--surface-2) hover:text-(--foreground)"
                )}
              >
                <Icon size={19} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 rounded-(--radius-md) px-3 py-2.5 text-[15px] text-(--foreground-muted) hover:bg-(--surface-2) hover:text-(--danger)"
          >
            <LogOut size={19} strokeWidth={2} />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 py-2 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-(--radius-md) px-3 py-1.5 text-[11px]",
                active ? "text-(--accent)" : "text-(--foreground-subtle)"
              )}
            >
              <Icon size={22} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
