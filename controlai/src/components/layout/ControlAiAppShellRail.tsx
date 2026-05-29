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
} from "@visualify/app-shell";
import { CONTROLAI_APP_SHELL_CATALOG } from "@/lib/visualify-app-catalog";
import {
  CONTROLAI_PRIMARY_NAV,
  CONTROLAI_ROUTES,
} from "@/lib/controlai-routes";
import { ControlAiRailAccountMenu } from "./ControlAiRailAccountMenu";

const CONTROLAI_RAIL_PINNED_KEY = "controlai-platform-rail-pinned";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

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

function IconPortfolios() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M4 7h16M4 12h16M4 17h10"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <rect x={9} y={3} width={6} height={4} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function navIcon(href: string) {
  switch (href) {
    case CONTROLAI_ROUTES.dashboard:
      return <IconDashboard />;
    case CONTROLAI_ROUTES.portfolios:
      return <IconPortfolios />;
    case CONTROLAI_ROUTES.projects:
      return <IconProjects />;
    case CONTROLAI_ROUTES.settings:
      return <IconSettings />;
    default:
      return <IconDashboard />;
  }
}

export function ControlAiAppShellRail() {
  const pathname = usePathname();
  const accountRailActive = appShellNavHrefActive(pathname, CONTROLAI_ROUTES.account);

  return (
    <AppShellRail ariaLabel="ControlAI navigation" pinnedStorageKey={CONTROLAI_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="ControlAI"
            currentAppName="Visualify ControlAI"
            catalog={CONTROLAI_APP_SHELL_CATALOG}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            {CONTROLAI_PRIMARY_NAV.map(({ href, label }) => (
              <AppShellRailNavLink
                key={href}
                href={href}
                active={appShellNavHrefActive(pathname, href)}
                label={label}
              >
                {navIcon(href)}
              </AppShellRailNavLink>
            ))}
          </nav>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <ControlAiRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
