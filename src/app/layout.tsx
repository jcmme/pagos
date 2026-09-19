import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pagos",
  description: "Control personal de gastos, pagos fijos, deudas y presupuestos.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // Sin esto, env(safe-area-inset-*) siempre vale cero y el dock flotante
  // quedaría debajo del indicador de inicio del iPhone.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased" data-theme="dark">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
