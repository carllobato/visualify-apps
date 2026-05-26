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
import { OS_PRIMARY_NAV, OS_ROUTES } from "@/lib/os-routes";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

function osMobilePageTitle(pathname: string): string {
  for (const { href, label } of OS_PRIMARY_NAV) {
    if (appShellNavHrefActive(pathname, href)) {
      return label;
    }
  }
  if (appShellNavHrefActive(pathname, OS_ROUTES.account)) {
    return "Account";
  }
  return "OS";
}

export function OsProtectedDocument({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = osMobilePageTitle(pathname);
  const bottomNavItems = buildOsMobileBottomNavItems(pathname);

  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        appName="OS"
        pageTitle={pageTitle}
        appIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion footer={footer}>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
      <AppShellMobileBottomNav items={bottomNavItems} ariaLabel="OS primary" />
    </AppShellMainColumn>
  );
}
