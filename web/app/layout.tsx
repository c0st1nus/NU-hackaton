import type { Metadata, Viewport } from "next";
import { I18nProvider } from "../dictionaries/i18n";
import { AppShell } from "./components/app-shell";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "FIRE — Freedom Intelligent Routing Engine",
    template: "%s — FIRE",
  },
  description: "AI-powered ticket routing for support teams",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
