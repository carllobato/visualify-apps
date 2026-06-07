"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileBottomNav,
  AppShellMobileHeader,
  AppShellRailBrandMark,
  AppShellScrollRegion,
  appShellMobileShellHeaderClassName,
} from "@visualify/app-shell";
import { buildHqMobileBottomNavItems } from "@/lib/hq-mobile-bottom-nav";
import { hqMobilePageTitle } from "@/lib/hq-routes";

export function HqSignedInDocument({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = hqMobilePageTitle(pathname);
  const bottomNavItems = buildHqMobileBottomNavItems(pathname);

  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        className={appShellMobileShellHeaderClassName}
        appName="HQ"
        pageTitle={pageTitle}
        showMenuTrigger={false}
        appIcon={<AppShellRailBrandMark alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
      <AppShellMobileBottomNav items={bottomNavItems} ariaLabel="HQ primary" />
    </AppShellMainColumn>
  );
}
