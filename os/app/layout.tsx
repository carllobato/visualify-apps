import type { Metadata, Viewport } from "next";
import { AppShellLegalDocumentProvider, visualifyAppDocumentTitle } from "@visualify/app-shell";
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

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppShellLegalDocumentProvider>
          <OsAppShellProviders>{children}</OsAppShellProviders>
        </AppShellLegalDocumentProvider>
      </body>
    </html>
  );
}
