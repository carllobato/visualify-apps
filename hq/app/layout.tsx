import type { Metadata } from "next";
import { AppShellLegalDocumentProvider, visualifyAppDocumentTitle } from "@visualify/app-shell";
import { HqAppShellProviders } from "@/components/hq-app-shell-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("HQ"),
  description: "Visualify workspace and account management",
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
          <HqAppShellProviders>{children}</HqAppShellProviders>
        </AppShellLegalDocumentProvider>
      </body>
    </html>
  );
}
