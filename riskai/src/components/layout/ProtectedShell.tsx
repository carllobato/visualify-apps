"use client";

import { useRef, useState } from "react";
import { OnboardingHost } from "@/components/onboarding/OnboardingHost";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { TopNav } from "./TopNav";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="ds-app-shell flex h-screen flex-col overflow-hidden">
      <OnboardingHost />
      <TopNav
        onMenuClick={() => setMobileNavOpen(true)}
        onAccountMenuOpen={() => setMobileNavOpen(false)}
      />
      <div className="ds-app-shell-body flex min-h-0 flex-1 overflow-hidden md:gap-3 md:pr-3">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="ds-app-main relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              ref={mainScrollRef}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-[var(--ds-app-header-height)] md:pt-[calc(var(--ds-app-header-height)+12px)] md:pb-3"
            >
              <div className="flex w-full min-h-full min-w-0 shrink-0 flex-col bg-[var(--ds-primary-foreground)] md:rounded-[var(--ds-radius-lg)] md:shadow-[var(--ds-shadow-sm)]">
                <div className="min-w-0 grow shrink-0">
                  <PageTransition scrollContainerRef={mainScrollRef}>{children}</PageTransition>
                </div>
                <div className="shrink-0">
                  <SiteLegalFooter />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
