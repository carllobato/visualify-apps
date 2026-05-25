"use client";

import type { ReactElement } from "react";
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
  appShellRailPrimaryNavClassName,
} from "@visualify/app-shell";
import { OS_APP_SHELL_CATALOG } from "@/lib/visualify-app-catalog";
import { OS_PRIMARY_NAV, OS_ROUTES } from "@/lib/os-routes";
import { OsRailAccountMenu } from "./OsRailAccountMenu";

const OS_RAIL_PINNED_KEY = "os-platform-rail-pinned";

/** Same asset path as HQ and RiskAI (`public/visualify-brand-mark.png`). */
const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return pathname === pathOnly || (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`));
}

function IconSun() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx={12} cy={12} r={4} stroke="currentColor" strokeWidth={1.5} />
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" d="M4 6h16v12H4z" />
      <path stroke="currentColor" strokeWidth={1.5} d="M4 10h16l-3 4H7l-3-4z" />
    </svg>
  );
}

function IconVectors() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M4 18l6-8 4 5 6-11" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path stroke="currentColor" strokeWidth={1.5} d="M4 8h6l2 2h8v10H4z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx={12} cy={12} r={8} stroke="currentColor" strokeWidth={1.5} />
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M12 8v4l3 2" />
    </svg>
  );
}

function IconBranch() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx={6} cy={6} r={2} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={18} cy={18} r={2} stroke="currentColor" strokeWidth={1.5} />
      <path stroke="currentColor" strokeWidth={1.5} d="M8 6h5a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function IconBriefing() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={5} y={3} width={14} height={18} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.5} />
      <path
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
      />
    </svg>
  );
}

const NAV_ICONS: Record<string, () => ReactElement> = {
  [OS_ROUTES.today]: IconSun,
  [OS_ROUTES.inbox]: IconInbox,
  [OS_ROUTES.vectors]: IconVectors,
  [OS_ROUTES.projects]: IconFolder,
  [OS_ROUTES.waitingOns]: IconClock,
  [OS_ROUTES.decisions]: IconBranch,
  [OS_ROUTES.briefings]: IconBriefing,
  [OS_ROUTES.settings]: IconSettings,
};

export function OsAppShellRail() {
  const pathname = usePathname();
  const accountRailActive =
    railNavHrefActive(pathname, OS_ROUTES.account) ||
    railNavHrefActive(pathname, OS_ROUTES.settings);

  return (
    <AppShellRail ariaLabel="OS navigation" pinnedStorageKey={OS_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="OS"
            currentAppName="Visualify OS"
            catalog={OS_APP_SHELL_CATALOG}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            {OS_PRIMARY_NAV.map(({ href, label }) => {
              const Icon = NAV_ICONS[href] ?? IconSun;
              return (
                <AppShellRailNavLink
                  key={href}
                  href={href}
                  active={railNavHrefActive(pathname, href)}
                  label={label}
                >
                  <Icon />
                </AppShellRailNavLink>
              );
            })}
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
