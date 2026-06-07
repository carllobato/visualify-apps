"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileBottomNav,
  AppShellScrollRegion,
} from "@visualify/app-shell";
import { HqMobileHeader } from "@/components/hq-mobile-header";
import { HqMobileMoreSheet } from "@/components/hq-mobile-more-sheet";
import { buildHqMobileBottomNavItems } from "@/lib/hq-mobile-bottom-nav";

export function HqSignedInDocument({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  const bottomNavItems = buildHqMobileBottomNavItems(pathname, {
    moreOnPress: () => setMoreMenuOpen((open) => !open),
    morePressed: moreMenuOpen,
  });

  return (
    <AppShellMainColumn>
      <HqMobileHeader />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
      <AppShellMobileBottomNav items={bottomNavItems} ariaLabel="HQ primary" />
      <HqMobileMoreSheet open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
    </AppShellMainColumn>
  );
}
