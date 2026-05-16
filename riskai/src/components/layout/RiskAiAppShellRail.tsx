"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppShellRail,
  AppShellRailBody,
  AppShellRailBrandAppMenu,
  AppShellRailBrandMark,
  AppShellRailFooter,
  AppShellRailFooterAccount,
  AppShellRailHeader,
  AppShellRailSeparator,
  RAIL_ROW_ACTIVE_CLASS,
  RAIL_ROW_INACTIVE_CLASS,
  RAIL_ROW_SHELL_CLASS,
  railLabelClass,
} from "@visualify/app-shell";
import { RISKAI_APP_SHELL_CATALOG } from "@/lib/visualify-app-catalog";
import {
  DASHBOARD_PATH,
  projectIdFromAppPathname,
  riskaiPath,
  RISKAI_BASE,
} from "@/lib/routes";
import { RiskAiLogoutButton } from "@/components/layout/RiskAiLogoutButton";

const RISKAI_APP_SHELL_RAIL_PINNED_KEY = "riskai-app-shell-rail-pinned";

/** Same asset path pattern as HQ `platform-rail.tsx` (`hq/public/visualify-brand-mark.png`). */
const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

const PORTFOLIOS_HREF = riskaiPath("/portfolios");
const PROJECTS_HREF = riskaiPath("/projects");
const ACCOUNT_SETTINGS_HREF = riskaiPath("/settings");

const PROJECTS_PREFIX = `${RISKAI_BASE}/projects`;

type RailPrimaryNavKey = "dashboard" | "portfolios" | "projects" | "risks" | "accountSettings";

function normalizePathname(pathname: string): string {
  if (!pathname) return "";
  return pathname.replace(/\/+$/, "") || pathname;
}

function pathEqualsOrStartsWith(pathname: string, base: string): boolean {
  const p = normalizePathname(pathname);
  const b = normalizePathname(base);
  return p === b || p.startsWith(`${b}/`);
}

function isDashboardNavActive(pathname: string): boolean {
  return pathEqualsOrStartsWith(pathname, DASHBOARD_PATH);
}

/** Portfolio list and detail routes; never `/riskai/projects/…`. */
function isPortfoliosNavActive(pathname: string): boolean {
  const p = normalizePathname(pathname);
  if (p.startsWith(PROJECTS_PREFIX)) return false;
  return pathEqualsOrStartsWith(pathname, PORTFOLIOS_HREF);
}

function isRisksNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/risks`));
}

/** Project list and project routes except the risks register. */
function isProjectsNavActive(pathname: string, projectId: string | null): boolean {
  if (isRisksNavActive(pathname, projectId)) return false;
  return pathEqualsOrStartsWith(pathname, PROJECTS_HREF);
}

function isAccountSettingsNavActive(pathname: string): boolean {
  return pathEqualsOrStartsWith(pathname, ACCOUNT_SETTINGS_HREF);
}

/**
 * At most one primary nav item is active. More specific segments win over broader prefixes
 * (e.g. risks over projects, settings over everything else on that path).
 */
function resolveActivePrimaryNav(pathname: string): RailPrimaryNavKey | null {
  const projectId = projectIdFromAppPathname(pathname);

  if (isAccountSettingsNavActive(pathname)) return "accountSettings";
  if (isRisksNavActive(pathname, projectId)) return "risks";
  if (isDashboardNavActive(pathname)) return "dashboard";
  if (isPortfoliosNavActive(pathname)) return "portfolios";
  if (isProjectsNavActive(pathname, projectId)) return "projects";
  return null;
}

function railNavRowClass(active: boolean): string {
  return (
    RAIL_ROW_SHELL_CLASS + (active ? RAIL_ROW_ACTIVE_CLASS : RAIL_ROW_INACTIVE_CLASS)
  );
}

function RailNavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={railNavRowClass(active) + " no-underline"}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">{children}</span>
      <span className={railLabelClass}>{label}</span>
    </Link>
  );
}

function IconCompass() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.06 6.28L7.76 16.24l2.06-6.28 6.44-2.12z" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.05 4.32a2 2 0 0 1-1.9 0L2 17.65" />
      <path d="m2 12 9.05 4.32a2 2 0 0 0 1.9 0L22 12" />
    </svg>
  );
}

function IconProjectsList() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconRisks() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0"
      aria-hidden
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconAccountSettings() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * RiskAI platform rail — compound `@visualify/app-shell` layout (HQ-aligned) with RiskAI nav destinations.
 * Shown when `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL=1` via `ProtectedShell`.
 */
export function RiskAiAppShellRail() {
  const pathname = usePathname();
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const risksHref =
    projectIdInUrl != null ? riskaiPath(`/projects/${projectIdInUrl}/risks`) : null;

  const activeNav = resolveActivePrimaryNav(pathname);

  return (
    <AppShellRail ariaLabel="RiskAI navigation" pinnedStorageKey={RISKAI_APP_SHELL_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="RiskAI"
            currentAppName="Visualify RiskAI"
            catalog={RISKAI_APP_SHELL_CATALOG}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
          />

          <AppShellRailSeparator />

          <nav className="flex flex-col gap-2.5" aria-label="Primary">
            <RailNavLink href={DASHBOARD_PATH} active={activeNav === "dashboard"} label="Dashboard">
              <IconCompass />
            </RailNavLink>
            <RailNavLink href={PORTFOLIOS_HREF} active={activeNav === "portfolios"} label="Portfolios">
              <IconLayers />
            </RailNavLink>
            <RailNavLink href={PROJECTS_HREF} active={activeNav === "projects"} label="Projects">
              <IconProjectsList />
            </RailNavLink>
            {risksHref != null ? (
              <RailNavLink href={risksHref} active={activeNav === "risks"} label="Risks">
                <IconRisks />
              </RailNavLink>
            ) : null}
            <RailNavLink
              href={ACCOUNT_SETTINGS_HREF}
              active={activeNav === "accountSettings"}
              label="Account Settings"
            >
              <IconAccountSettings />
            </RailNavLink>
          </nav>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <RiskAiLogoutButton variant="rail" />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
