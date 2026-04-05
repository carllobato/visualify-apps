import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@visualify/design-system/src/styles/globals.css";
import { ThemeSync } from "@/components/theme-sync";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visualify — Understand risk. Make better decisions.",
  description:
    "Visualify helps project teams quantify uncertainty, surface real risks, and make confident decisions using data — not instinct. RiskAI is our flagship simulation-driven risk engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body
        className={`${inter.className} min-h-full flex flex-col bg-[var(--ds-canvas)] text-[var(--ds-text-primary)]`}
      >
        <Script id="visualify-theme-init" strategy="beforeInteractive">
          {`(function(){try{var d=document.documentElement;d.classList.remove('dark');d.removeAttribute('data-theme');try{localStorage.setItem('visualify-theme','light');}catch(e2){}}catch(e){}})();`}
        </Script>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
