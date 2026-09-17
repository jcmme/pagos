import { AppShell } from "@/components/layout/AppShell";
import { requireUserId } from "@/lib/session";
import { getQuickCaptureData } from "@/modules/transactions/quick-data";

// El botón de captura vive en el layout para estar disponible en toda la app,
// así que sus datos (categorías, cuentas, atajos) se cargan aquí una sola vez.
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const captureData = await getQuickCaptureData(await requireUserId());

  return <AppShell captureData={captureData}>{children}</AppShell>;
}
