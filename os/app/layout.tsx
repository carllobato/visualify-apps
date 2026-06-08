import type { Metadata, Viewport } from "next";
import {
  AppShellLegalDocumentProvider,
  VisualifyAppLaunchBrandMarkPreload,
  VisualifyAppLaunchController,
  VisualifyAppLaunchCriticalStyles,
  visualifyAppDocumentTitle,
  visualifyAppLaunchViewport,
} from "@visualify/app-shell";
import { OsAppShellProviders } from "@/components/layout/OsAppShellProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("OS"),
  description: "Visualify OS — personal operating system",
  appleWebApp: {
    capable: true,
    title: "OS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = visualifyAppLaunchViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <VisualifyAppLaunchCriticalStyles />
        <VisualifyAppLaunchBrandMarkPreload />
      </head>
      <body suppressHydrationWarning>
        <VisualifyAppLaunchController>
          <AppShellLegalDocumentProvider>
            <OsAppShellProviders>{children}</OsAppShellProviders>
          </AppShellLegalDocumentProvider>
        </VisualifyAppLaunchController>
      </body>
    </html>
  );
}
