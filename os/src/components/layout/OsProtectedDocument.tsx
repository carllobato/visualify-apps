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
  appShellNavHrefActive,
} from "@visualify/app-shell";
import { buildOsMobileBottomNavItems } from "@/lib/os-mobile-bottom-nav";
import { OS_PRIMARY_NAV, OS_ROUTES, OS_SECONDARY_NAV } from "@/lib/os-routes";
import "./os-mobile-shell.css";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

function osMobilePageTitle(pathname: string): string {
  for (const { href, label } of OS_PRIMARY_NAV) {
    if (appShellNavHrefActive(pathname, href)) {
      return label;
    }
  }
  for (const { href, label } of OS_SECONDARY_NAV) {
    if (appShellNavHrefActive(pathname, href)) {
      return label;
    }
  }
  if (appShellNavHrefActive(pathname, OS_ROUTES.account)) {
    return "Account";
  }
  return "OS";
}

export function OsProtectedDocument({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = osMobilePageTitle(pathname);
  const bottomNavItems = buildOsMobileBottomNavItems(pathname);

  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        className="os-mobile-shell-header"
        appName={pageTitle}
        showMenuTrigger={false}
        appIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
      <AppShellMobileBottomNav items={bottomNavItems} ariaLabel="OS primary" />
    </AppShellMainColumn>
  );
}
