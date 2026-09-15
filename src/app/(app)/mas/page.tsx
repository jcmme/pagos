import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { NAV_ITEMS, PRIMARY_HREFS } from "@/components/layout/nav";
import { logoutAction } from "@/app/(app)/actions";

// Solo existe para móvil: la barra inferior muestra las secciones de uso
// diario y aquí viven las demás.
export default function MasPage() {
  const rest = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));

  return (
    <div className="md:hidden">
      <h1 className="mb-6 text-[26px] font-semibold">Más</h1>

      <div className="flex flex-col gap-2">
        {rest.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="flex items-center justify-between p-4">
                <span className="flex items-center gap-3 text-[15px]">
                  <Icon size={19} className="text-(--accent)" />
                  {item.label}
                </span>
                <ChevronRight size={17} className="text-(--foreground-subtle)" />
              </Card>
            </Link>
          );
        })}

        <form action={logoutAction}>
          <button type="submit" className="w-full text-left">
            <Card className="flex items-center gap-3 p-4 text-[15px] text-(--danger)">
              <LogOut size={19} />
              Cerrar sesión
            </Card>
          </button>
        </form>
      </div>
    </div>
  );
}
