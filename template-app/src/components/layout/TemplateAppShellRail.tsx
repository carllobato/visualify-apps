"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppShellRail,
  AppShellRailBody,
  AppShellRailBrandAppMenu,
  AppShellRailFooter,
  AppShellRailFooterAccount,
  AppShellRailHeader,
  AppShellRailSeparator,
  appShellRailIconWellClassName,
  appShellRailNavRowClass,
  appShellRailPrimaryNavClassName,
  railLabelClass,
} from "@visualify/app-shell";
import { TEMPLATE_APP_SHELL_CATALOG } from "@/lib/visualify-app-catalog";
import { TemplateRailAccountMenu } from "./TemplateRailAccountMenu";

const TEMPLATE_RAIL_PINNED_KEY = "template-app-platform-rail-pinned";

function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return pathname === pathOnly || (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`));
}

function RailNavLink({
  href,
  label,
  pathname,
  children,
}: {
  href: string;
  label: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = railNavHrefActive(pathname, href);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={appShellRailNavRowClass(active)}
    >
      <span className={appShellRailIconWellClassName}>{children}</span>
      <span className={railLabelClass}>{label}</span>
    </Link>
  );
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
  return (
    <span
      aria-hidden
      className={
        "flex size-10 shrink-0 items-center justify-center select-none text-[length:var(--ds-text-lg)] font-bold leading-none tracking-tight text-[var(--ds-text-primary)]"
      }
    >
      V
    </span>
  );
}

/**
 * Template App platform rail — `@visualify/app-shell` compounds (HQ-aligned).
 * Intentionally minimal: app menu, dashboard nav, account menu (no workspace list).
 */
export function TemplateAppShellRail() {
  const pathname = usePathname();
  const accountRailActive = railNavHrefActive(pathname, "/account");

  return (
    <AppShellRail ariaLabel="Template App navigation" pinnedStorageKey={TEMPLATE_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="Template App"
            currentAppName="Visualify Template App"
            catalog={TEMPLATE_APP_SHELL_CATALOG}
            brandIcon={<BrandMonogramMark />}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            <RailNavLink href="/dashboard" pathname={pathname} label="Dashboard">
              <IconDashboard />
            </RailNavLink>
          </nav>
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
