import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/context/ThemeContext";
import { ProjectionScenarioProvider } from "@/context/ProjectionScenarioContext";
import { LegalDocumentProvider } from "@/components/legal/LegalDocumentProvider";
import { RiskRegisterProvider } from "@/store/risk-register.store";
import { InactivityGuard } from "@/components/InactivityGuard";
import { SingleSessionGuard } from "@/components/SingleSessionGuard";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "RiskAI",
  description: "AI-powered Risk Register",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('riskai-theme');
    var theme = (stored === 'dark' || stored === 'light') ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

/** Mirror sidebar localStorage → cookie before the request pipeline so protected SSR can match rail width (see Sidebar + protected layout). */
const sideNavPinnedCookieScript = `
(function() {
  try {
    var v = localStorage.getItem('riskai-side-nav-pinned');
    if (v === 'true' || v === 'false') {
      document.cookie = 'riskai_side_nav_pinned=' + v + '; Path=/; Max-Age=31536000; SameSite=Lax';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: sideNavPinnedCookieScript }} />
      </head>
      <body className={`antialiased font-sans ${geist.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <ProjectionScenarioProvider>
            <RiskRegisterProvider>
              <LegalDocumentProvider>
                {children}
                <InactivityGuard />
                <SingleSessionGuard />
              </LegalDocumentProvider>
            </RiskRegisterProvider>
          </ProjectionScenarioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
