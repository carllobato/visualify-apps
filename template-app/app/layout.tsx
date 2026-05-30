import type { Metadata } from "next";
import { AppShellLegalDocumentProvider, visualifyAppDocumentTitle } from "@visualify/app-shell";
import { TemplateAppShellProviders } from "@/components/layout/TemplateAppShellProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("Template App"),
  description: "Visualify product app starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShellLegalDocumentProvider>
          <TemplateAppShellProviders>{children}</TemplateAppShellProviders>
        </AppShellLegalDocumentProvider>
      </body>
    </html>
  );
}
