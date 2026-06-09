import type { Metadata, Viewport } from "next";
import {
  AppShellLegalDocumentProvider,
  VisualifyAppLaunchBrandMarkPreload,
  VisualifyAppLaunchController,
  VisualifyAppLaunchCriticalStyles,
  visualifyAppDocumentTitle,
  visualifyAppLaunchViewport,
} from "@visualify/app-shell";
import { ControlAiAppShellProviders } from "@/components/layout/ControlAiAppShellProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("ControlAI"),
  description: "Visualify ControlAI — control and governance for your programmes.",
  appleWebApp: {
    capable: true,
    title: "ControlAI",
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
            <ControlAiAppShellProviders>{children}</ControlAiAppShellProviders>
          </AppShellLegalDocumentProvider>
        </VisualifyAppLaunchController>
      </body>
    </html>
  );
}
