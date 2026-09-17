import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NotificationItem } from "@/modules/notifications/feed";

// La app no tenía cabecera: el menú es sidebar en escritorio y barra inferior
// en móvil. Esta franja existe para lo que no pertenece a ninguna página en
// particular, empezando por la campana de avisos.
//
// La marca solo aparece en móvil porque en escritorio ya está en el sidebar.
export function TopBar({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 px-4 md:px-8">
      <span className="text-[17px] font-semibold tracking-tight md:hidden">💰 Pagos</span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell notifications={notifications} />
      </div>
    </header>
  );
}
