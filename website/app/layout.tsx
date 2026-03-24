import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeSync } from "@/components/theme-sync";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visualify — Coming soon",
  description:
    "Visualify is building a more thoughtful approach to modern software — calm, structured, and designed for clarity. Request early access.",
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
      <body className={`${inter.className} min-h-full flex flex-col bg-background text-foreground`}>
        <Script id="visualify-theme-init" strategy="beforeInteractive">
          {`(function(){try{var k='visualify-theme';var t=localStorage.getItem(k);var d=document.documentElement;if(t==='dark')d.classList.add('dark');else if(t==='light')d.classList.remove('dark');else if(window.matchMedia('(prefers-color-scheme: dark)').matches)d.classList.add('dark');}catch(e){}})();`}
        </Script>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
