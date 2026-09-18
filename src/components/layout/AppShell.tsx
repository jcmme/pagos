"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(app)/actions";
import { CaptureFab } from "@/components/capture/CaptureFab";
import type { QuickCaptureData } from "@/modules/transactions/quick-data";
import { NAV_ITEMS, PRIMARY_HREFS } from "./nav";

// En móvil no caben doce secciones: se muestran las de uso diario y el resto
// vive en "Más".
const MOBILE_ITEMS = [
  ...NAV_ITEMS.filter((item) => PRIMARY_HREFS.includes(item.href)),
  { href: "/mas", label: "Más", icon: MoreHorizontal },
];

export function AppShell({
  children,
  captureData,
}: {
  children: React.ReactNode;
  captureData: QuickCaptureData;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-(--border) p-4 md:flex">
        <div className="mb-6 px-2 text-[20px] font-semibold tracking-tight">💰 Pagos</div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-(--radius-md) px-3 py-2 text-[14px] transition-colors",
                  active
                    ? "bg-(--accent)/15 text-(--accent)"
                    : "text-(--foreground-muted) hover:bg-(--surface-2) hover:text-(--foreground)"
                )}
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-2 flex w-full items-center gap-3 rounded-(--radius-md) px-3 py-2 text-[14px] text-(--foreground-muted) hover:bg-(--surface-2) hover:text-(--danger)"
          >
            <LogOut size={18} strokeWidth={2} />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <main className="flex-1 pb-24 md:pb-0">
        {/* La llave por ruta hace que cada pantalla entre con un fundido en
            vez del corte seco. Next ya reemplaza el árbol al navegar, así que
            no está forzando un desmontaje que no fuera a ocurrir. */}
        <div
          key={pathname}
          className="animate-fade mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8"
        >
          {children}
        </div>
      </main>

      <CaptureFab data={captureData} />

      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 py-2 md:hidden">
        {MOBILE_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/mas" && !MOBILE_ITEMS.some((nav) => nav.href === pathname));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "pressable flex flex-col items-center gap-1 rounded-(--radius-md) px-3 py-1.5 text-[11px]",
                active ? "text-(--accent)" : "text-(--foreground-subtle)"
              )}
            >
              <Icon size={21} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
