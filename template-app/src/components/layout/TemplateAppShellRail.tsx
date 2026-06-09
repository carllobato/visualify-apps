"use client";

import { usePathname } from "next/navigation";
import {
  AppShellRail,
  AppShellRailBody,
  AppShellRailBrandAppMenu,
  AppShellRailBrandMark,
  AppShellRailFooter,
  AppShellRailFooterAccount,
  AppShellRailHeader,
  AppShellRailNavScroll,
  AppShellRailSeparator,
  AppShellRailNavLink,
  appShellRailPrimaryNavClassName,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import { TemplateRailAccountMenu } from "./TemplateRailAccountMenu";

const TEMPLATE_RAIL_PINNED_KEY = "template-app-platform-rail-pinned";

function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return pathname === pathOnly || (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`));
}

function IconDashboard() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={3} y={3} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={3} width={8} height={5} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={10} width={8} height={11} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={3} y={13} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function BrandMonogramMark() {
  return <AppShellRailBrandMark alt="" />;
}

/**
 * Template App platform rail — `@visualify/app-shell` compounds (HQ-aligned).
 * Intentionally minimal: app menu, dashboard nav, account menu (no workspace list).
 */
export function TemplateAppShellRail({
  appCatalog,
}: {
  appCatalog: readonly AppShellRailAppCatalogEntry[];
}) {
  const pathname = usePathname();
  const accountRailActive = railNavHrefActive(pathname, "/account");

  return (
    <AppShellRail ariaLabel="Template App navigation" pinnedStorageKey={TEMPLATE_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="Template App"
            currentAppId="template-app"
            catalog={appCatalog}
            brandIcon={<BrandMonogramMark />}
          />

          <AppShellRailSeparator />

          <AppShellRailNavScroll>
            <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
              <AppShellRailNavLink
                href="/dashboard"
                active={railNavHrefActive(pathname, "/dashboard")}
                label="Dashboard"
              >
                <IconDashboard />
              </AppShellRailNavLink>
            </nav>
          </AppShellRailNavScroll>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <TemplateRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
