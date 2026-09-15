import { redirect } from "next/navigation";

// La sección se llamaba "gastos" cuando la app solo registraba gastos. Ahora
// también hay ingresos y transferencias. Se conserva la ruta por los enlaces
// y marcadores viejos.
export default function GastosPage() {
  redirect("/movimientos");
}
