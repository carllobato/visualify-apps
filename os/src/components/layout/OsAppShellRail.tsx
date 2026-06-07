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
  AppShellRailNavLink,
  AppShellRailSeparator,
  appShellNavHrefActive,
  appShellRailPrimaryNavClassName,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import { OsNavIcon } from "@/lib/os-nav-icons";
import { OS_PRIMARY_NAV, OS_ROUTES } from "@/lib/os-routes";
import { OsRailAccountMenu } from "./OsRailAccountMenu";

const OS_RAIL_PINNED_KEY = "os-platform-rail-pinned";

export function OsAppShellRail({ appCatalog }: { appCatalog: readonly AppShellRailAppCatalogEntry[] }) {
  const pathname = usePathname();
  const accountRailActive =
    appShellNavHrefActive(pathname, OS_ROUTES.account) ||
    appShellNavHrefActive(pathname, OS_ROUTES.settings);

  return (
    <AppShellRail ariaLabel="OS navigation" pinnedStorageKey={OS_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="OS"
            currentAppId="os"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark alt="" />}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            {OS_PRIMARY_NAV.map(({ href, label }) => (
              <AppShellRailNavLink
                key={href}
                href={href}
                active={appShellNavHrefActive(pathname, href)}
                label={label}
              >
                <OsNavIcon href={href} />
              </AppShellRailNavLink>
            ))}
          </nav>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <OsRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
