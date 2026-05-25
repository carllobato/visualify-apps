import type { Metadata } from "next";
import { AppShellLegalDocumentProvider, visualifyAppDocumentTitle } from "@visualify/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("OS"),
  description: "Visualify OS — personal operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShellLegalDocumentProvider>{children}</AppShellLegalDocumentProvider>
      </body>
    </html>
  );
}
