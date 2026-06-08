import type { Metadata, Viewport } from "next";
import {
  AppShellLegalDocumentProvider,
  VisualifyAppLaunchBrandMarkPreload,
  VisualifyAppLaunchController,
  VisualifyAppLaunchCriticalStyles,
  visualifyAppDocumentTitle,
  visualifyAppLaunchViewport,
} from "@visualify/app-shell";
import { ReportAppShellProviders } from "@/components/layout/ReportAppShellProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("Report"),
  description: "Visualify Report — standalone reporting product",
  // Standalone full-screen with a translucent status bar so content scrolls behind the notch.
  appleWebApp: {
    capable: true,
    title: "Report",
    statusBarStyle: "black-translucent",
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
            <ReportAppShellProviders>{children}</ReportAppShellProviders>
          </AppShellLegalDocumentProvider>
        </VisualifyAppLaunchController>
      </body>
    </html>
  );
}
