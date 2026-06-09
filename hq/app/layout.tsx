import type { Metadata, Viewport } from "next";
import {
  AppShellLegalDocumentProvider,
  VisualifyAppLaunchBrandMarkPreload,
  VisualifyAppLaunchController,
  VisualifyAppLaunchCriticalStyles,
  visualifyAppDocumentTitle,
  visualifyAppLaunchViewport,
} from "@visualify/app-shell";
import { HqAppShellProviders } from "@/components/hq-app-shell-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("HQ"),
  description: "Visualify workspace and account management",
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
            <HqAppShellProviders>{children}</HqAppShellProviders>
          </AppShellLegalDocumentProvider>
        </VisualifyAppLaunchController>
      </body>
    </html>
  );
}
