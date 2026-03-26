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
      <div className="ds-app-shell-body flex min-h-0 flex-1 overflow-hidden">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={mainScrollRef}
            className="ds-app-main relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <div className="pt-[var(--ds-app-header-height)]">
              <div className="flex min-h-[calc(100vh-var(--ds-app-header-height))] flex-1 flex-col">
                <div className="flex-1">
                  <PageTransition scrollContainerRef={mainScrollRef}>{children}</PageTransition>
                </div>
                <div className="mt-auto">
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
