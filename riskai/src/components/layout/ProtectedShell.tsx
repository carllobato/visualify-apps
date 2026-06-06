"use client";

import { useState } from "react";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileHeader,
  AppShellOuterCanvas,
  AppShellRailBrandMark,
  AppShellScrollRegion,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import { OnboardingHost } from "@/components/onboarding/OnboardingHost";
import { RISKAI_ENABLE_APP_SHELL } from "@/lib/riskai-app-shell-flag";
import { RiskAiAppShellRail } from "@/components/layout/RiskAiAppShellRail";
import { TopNav } from "./TopNav";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";

type ProtectedShellProps = {
  children: React.ReactNode;
  /** From server cookie so sidebar SSR matches saved rail width. */
  initialSideNavPinned?: boolean;
  appCatalog: readonly AppShellRailAppCatalogEntry[];
};

export function ProtectedShell({
  children,
  initialSideNavPinned = true,
  appCatalog,
}: ProtectedShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (RISKAI_ENABLE_APP_SHELL) {
    return (
      <>
        <OnboardingHost />
        <AppShellOuterCanvas mobileHeaderExpected>
          <RiskAiAppShellRail appCatalog={appCatalog} />
          <AppShellMainColumn>
            <AppShellMobileHeader
              appName="Risk AI"
              pageTitle="Dashboard"
              appIcon={<AppShellRailBrandMark src="/visualify-brand-mark.png" alt="" />}
            />
            <AppShellFrameGutter>
              <AppShellFramedSurface>
                <AppShellScrollRegion>
                  <PageTransition>{children}</PageTransition>
                </AppShellScrollRegion>
              </AppShellFramedSurface>
            </AppShellFrameGutter>
          </AppShellMainColumn>
        </AppShellOuterCanvas>
      </>
    );
  }

  return (
    <div className="ds-app-shell flex min-h-screen flex-col">
      <OnboardingHost />
      <TopNav
        shellDocumentAlign
        onMenuClick={() => setMobileNavOpen(true)}
        onAccountMenuOpen={() => setMobileNavOpen(false)}
      />
      <div className="ds-app-shell-body flex w-full min-h-[calc(100dvh-var(--ds-app-header-height))] flex-1 md:gap-3 md:pr-3">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          initialSideNavPinned={initialSideNavPinned}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="ds-app-main relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-[var(--ds-app-header-height)] md:pt-[calc(var(--ds-app-header-height)+12px)] md:pb-3">
              <div className="ds-app-document-shell flex min-h-0 min-w-0 flex-1 flex-col md:rounded-[var(--ds-radius-app-frame)]">
                <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
                  <div className="min-h-0 min-w-0 flex-1">
                    <PageTransition>{children}</PageTransition>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
