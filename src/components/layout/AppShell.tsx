"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON } from "@/lib/icons";
import { logoutAction } from "@/app/(app)/actions";
import type { QuickCaptureData } from "@/modules/transactions/quick-data";
import { Dock } from "./Dock";
import { NAV_ITEMS } from "./nav";

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
                <Icon size={ICON.md} />
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
            <LogOut size={ICON.md} />
            Cerrar sesión
          </button>
        </form>
      </aside>

      {/* El hueco de abajo lo dicta el propio dock, no un número a ojo: si
          cambia su altura o el área segura del teléfono, el contenido se
          ajusta solo. Arriba, viewportFit: "cover" mete la página bajo la
          barra de estado, así que también hay que apartarse de ella. */}
      <main
        className="flex-1"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "calc(var(--dock-bottom) + var(--dock-height) + 1rem)",
        }}
      >
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

      <Dock data={captureData} />
    </div>
  );
}
