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
  // capable:false keeps iOS "Add to Home Screen" launching in Safari (with toolbar) rather than
  // standalone full-screen, which avoids the standalone-only viewport/layout bugs.
  appleWebApp: {
    capable: false,
    title: "OS",
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
