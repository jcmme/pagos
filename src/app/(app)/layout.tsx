import { AppShell } from "@/components/layout/AppShell";
import { requireUserId } from "@/lib/session";
import { getQuickCaptureData } from "@/modules/transactions/quick-data";
import { getNotifications } from "@/modules/notifications/feed";

// El botón de captura y la campana de avisos viven en el layout para estar
// disponibles en toda la app, así que sus datos se cargan aquí una sola vez.
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await requireUserId();
  const [captureData, notifications] = await Promise.all([
    getQuickCaptureData(userId),
    getNotifications(userId),
  ]);

  return (
    <AppShell captureData={captureData} notifications={notifications}>
      {children}
    </AppShell>
  );
}
