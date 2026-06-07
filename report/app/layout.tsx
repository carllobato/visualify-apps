import type { Metadata, Viewport } from "next";
import {
  AppShellLegalDocumentProvider,
  VisualifyAppLaunchBrandMarkPreload,
  VisualifyAppLaunchController,
  VisualifyAppLaunchCriticalStyles,
  visualifyAppDocumentTitle,
} from "@visualify/app-shell";
import { ReportAppShellProviders } from "@/components/layout/ReportAppShellProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("Report"),
  description: "Visualify Report — standalone reporting product",
  appleWebApp: {
    capable: true,
    title: "Report",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
  viewportFit: "cover",
};

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
