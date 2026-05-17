import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { THEME_LIGHT_ONLY_MVP } from "@/config/themeLightOnly";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProjectionScenarioProvider } from "@/context/ProjectionScenarioContext";
import { AppShellLegalDocumentProvider, visualifyAppDocumentTitle } from "@visualify/app-shell";
import { RiskRegisterProvider } from "@/store/risk-register.store";
import { InactivityGuard } from "@/components/InactivityGuard";
import { SingleSessionGuard } from "@/components/SingleSessionGuard";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: visualifyAppDocumentTitle("RiskAI"),
  description: "AI-powered Risk Register",
};

const themeScriptLightOnly = `
(function() {
  try {
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('riskai-theme', 'light');
  } catch (e) {}
})();
`;

const themeScriptFull = `
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

const themeScript = THEME_LIGHT_ONLY_MVP ? themeScriptLightOnly : themeScriptFull;

/**
 * Single-session enforcement (`SingleSessionGuard`) is **off by default** for MVP platform auth.
 *
 * Visualify now shares one Supabase session across HQ (`hq.*`) and apps (`app.*`) via domain-scoped
 * auth cookies. `SingleSessionGuard` stores the JWT in `visualify_user_sessions` and signs the user
 * out when that value does not match the current `access_token`. HQ login rotates tokens without
 * updating that row, so the guard treated legitimate shared-auth flows as “session replaced”.
 *
 * Re-enable only after a reclaim / cross-product session coordination design. Set
 * `NEXT_PUBLIC_RISKAI_ENABLE_SINGLE_SESSION_GUARD=1` in the environment (see `.env.example`).
 */
const singleSessionGuardEnabled =
  process.env.NEXT_PUBLIC_RISKAI_ENABLE_SINGLE_SESSION_GUARD === "1";

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
              <AppShellLegalDocumentProvider>
                {children}
                <InactivityGuard />
                {singleSessionGuardEnabled ? <SingleSessionGuard /> : null}
              </AppShellLegalDocumentProvider>
            </RiskRegisterProvider>
          </ProjectionScenarioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
