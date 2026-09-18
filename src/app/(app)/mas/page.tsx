import { LogOut } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { logoutAction } from "@/app/(app)/actions";
import { MoreMenu } from "./MoreMenu";

// Solo existe para móvil: la barra inferior muestra las secciones de uso
// diario y aquí viven las demás.
//
// La lista es cliente porque cada fila anima su miniatura al entrar en
// pantalla; el cierre de sesión se queda aquí, en el servidor, para seguir
// siendo una server action y no un fetch.
export default function MasPage() {
  return (
    <div className="md:hidden">
      <h1 className="mb-6 text-[26px] font-semibold">Más</h1>

      <div className="flex flex-col gap-2">
        <MoreMenu />

        <form action={logoutAction}>
          <button type="submit" className="w-full text-left">
            <Card className="pressable flex items-center gap-3 p-4 text-[15px] text-(--danger)">
              <LogOut size={19} />
              Cerrar sesión
            </Card>
          </button>
        </form>
      </div>

      {/* El botón flotante + se posa sobre la esquina inferior derecha; sin
          este respiro taparía la última fila. */}
      <div className="h-6" />
    </div>
  );
}
