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
  AppShellRailNavSection,
  AppShellRailSeparator,
  appShellRailIconWellClassName,
  appShellRailNavRowClass,
  appShellRailPrimaryNavClassName,
  railLabelClass,
} from "@visualify/app-shell";
import { RISKAI_APP_SHELL_CATALOG } from "@/lib/visualify-app-catalog";
import {
  DASHBOARD_PATH,
  projectIdFromAppPathname,
  riskaiPath,
  stripLegacyRiskAiPrefix,
} from "@/lib/routes";
import { RiskAiRailAccountMenu } from "@/components/layout/RiskAiRailAccountMenu";
import { RiskAiRailFooterHelp } from "@/components/layout/RiskAiRailFooterHelp";
import { useResolvedPortfolioId } from "@/hooks/useResolvedPortfolioId";

const RISKAI_APP_SHELL_RAIL_PINNED_KEY = "riskai-app-shell-rail-pinned";

/** Same asset path pattern as HQ `platform-rail.tsx` (`hq/public/visualify-brand-mark.png`). */
const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

const PORTFOLIOS_HREF = riskaiPath("/portfolios");
const PROJECTS_HREF = riskaiPath("/projects");
const ACCOUNT_SETTINGS_HREF = riskaiPath("/settings");

const PROJECTS_PREFIX = riskaiPath("/projects");

type RailPrimaryNavKey =
  | "dashboard"
  | "portfolios"
  | "portfolioOverview"
  | "portfolioProjects"
  | "portfolioSettings"
  | "projects"
  | "projectOverview"
  | "risks"
  | "simulation"
  | "projectSettings";

function normalizePathname(pathname: string): string {
  if (!pathname) return "";
  const flat = stripLegacyRiskAiPrefix(pathname);
  return flat.replace(/\/+$/, "") || flat;
}

function pathEqualsOrStartsWith(pathname: string, base: string): boolean {
  const p = normalizePathname(pathname);
  const b = normalizePathname(base);
  return p === b || p.startsWith(`${b}/`);
}

function isDashboardNavActive(pathname: string): boolean {
  return pathEqualsOrStartsWith(pathname, DASHBOARD_PATH);
}

function isPortfolioSettingsNavActive(pathname: string, portfolioId: string | null): boolean {
  if (portfolioId == null) return false;
  return pathEqualsOrStartsWith(
    pathname,
    riskaiPath(`/portfolios/${portfolioId}/portfolio-settings`)
  );
}

function portfolioOverviewPath(portfolioId: string): string {
  return normalizePathname(riskaiPath(`/portfolios/${portfolioId}`));
}

function isPortfolioOverviewNavActive(pathname: string, portfolioId: string | null): boolean {
  if (portfolioId == null) return false;
  return normalizePathname(pathname) === portfolioOverviewPath(portfolioId);
}

function isPortfolioProjectsNavActive(pathname: string, portfolioId: string | null): boolean {
  if (portfolioId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/portfolios/${portfolioId}/projects`));
}

/**
 * Portfolio list and in-portfolio routes; inactive when a more specific portfolio
 * child (overview, projects, settings) is active.
 */
function isPortfoliosNavActive(pathname: string, portfolioId: string | null): boolean {
  const p = normalizePathname(pathname);
  if (p.startsWith(PROJECTS_PREFIX)) return false;
  if (isPortfolioOverviewNavActive(pathname, portfolioId)) return false;
  if (isPortfolioProjectsNavActive(pathname, portfolioId)) return false;
  if (isPortfolioSettingsNavActive(pathname, portfolioId)) return false;
  return pathEqualsOrStartsWith(pathname, PORTFOLIOS_HREF);
}

function projectBasePath(projectId: string): string {
  return normalizePathname(riskaiPath(`/projects/${projectId}`));
}

function isProjectOverviewNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return normalizePathname(pathname) === projectBasePath(projectId);
}

function isRisksNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/risks`));
}

function isSimulationNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/simulation`));
}

function isProjectSettingsNavActive(pathname: string, projectId: string | null): boolean {
  if (projectId == null) return false;
  return pathEqualsOrStartsWith(pathname, riskaiPath(`/projects/${projectId}/settings`));
}

/** Global projects list only (`/riskai/projects`), not project detail routes. */
function isProjectsNavActive(pathname: string, projectId: string | null): boolean {
  if (isProjectOverviewNavActive(pathname, projectId)) return false;
  if (isRisksNavActive(pathname, projectId)) return false;
  if (isSimulationNavActive(pathname, projectId)) return false;
  if (isProjectSettingsNavActive(pathname, projectId)) return false;
  return normalizePathname(pathname) === normalizePathname(PROJECTS_HREF);
}

function isAccountSettingsRouteActive(pathname: string): boolean {
  return pathEqualsOrStartsWith(pathname, ACCOUNT_SETTINGS_HREF);
}

/**
 * At most one primary nav item is active. More specific segments win over broader prefixes
 * (e.g. portfolio settings over portfolios; project sub-routes over the projects list).
 */
function resolveActivePrimaryNav(
  pathname: string,
  portfolioId: string | null
): RailPrimaryNavKey | null {
  const projectId = projectIdFromAppPathname(pathname);

  if (isRisksNavActive(pathname, projectId)) return "risks";
  if (isSimulationNavActive(pathname, projectId)) return "simulation";
  if (isProjectSettingsNavActive(pathname, projectId)) return "projectSettings";
  if (isProjectOverviewNavActive(pathname, projectId)) return "projectOverview";
  if (isPortfolioSettingsNavActive(pathname, portfolioId)) return "portfolioSettings";
  if (isPortfolioProjectsNavActive(pathname, portfolioId)) return "portfolioProjects";
  if (isPortfolioOverviewNavActive(pathname, portfolioId)) return "portfolioOverview";
  if (isDashboardNavActive(pathname)) return "dashboard";
  if (isPortfoliosNavActive(pathname, portfolioId)) return "portfolios";
  if (isProjectsNavActive(pathname, projectId)) return "projects";
  return null;
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
      className={appShellRailNavRowClass(active)}
    >
      <span className={appShellRailIconWellClassName}>{children}</span>
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

function IconProjectOverview() {
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
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
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

function IconSettings() {
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

function IconSimulation() {
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
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

/**
 * RiskAI platform rail — compound `@visualify/app-shell` layout (HQ-aligned) with RiskAI nav destinations.
 * Shown when `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL=1` via `ProtectedShell`.
 */
export function RiskAiAppShellRail() {
  const pathname = usePathname();
  const portfolioId = useResolvedPortfolioId(pathname);
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const onDashboard = isDashboardNavActive(pathname);
  const showPortfolioNav = portfolioId != null;
  const showGlobalPortfoliosAndProjects = !onDashboard && !showPortfolioNav;

  const portfolioOverviewHref =
    portfolioId != null ? riskaiPath(`/portfolios/${portfolioId}`) : null;
  const portfolioProjectsHref =
    portfolioId != null ? riskaiPath(`/portfolios/${portfolioId}/projects`) : null;
  const portfolioSettingsHref =
    portfolioId != null
      ? riskaiPath(`/portfolios/${portfolioId}/portfolio-settings`)
      : null;
  const projectOverviewHref =
    projectIdInUrl != null ? riskaiPath(`/projects/${projectIdInUrl}`) : null;
  const risksHref =
    projectIdInUrl != null ? riskaiPath(`/projects/${projectIdInUrl}/risks`) : null;
  const simulationHref =
    projectIdInUrl != null ? riskaiPath(`/projects/${projectIdInUrl}/simulation`) : null;
  const projectSettingsHref =
    projectIdInUrl != null ? riskaiPath(`/projects/${projectIdInUrl}/settings`) : null;

  const activeNav = resolveActivePrimaryNav(pathname, portfolioId);
  const accountRailActive = isAccountSettingsRouteActive(pathname);

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

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            <RailNavLink href={DASHBOARD_PATH} active={activeNav === "dashboard"} label="Dashboard">
              <IconCompass />
            </RailNavLink>
            {showGlobalPortfoliosAndProjects ? (
              <>
                <RailNavLink href={PORTFOLIOS_HREF} active={activeNav === "portfolios"} label="Portfolios">
                  <IconLayers />
                </RailNavLink>
                <RailNavLink href={PROJECTS_HREF} active={activeNav === "projects"} label="Projects">
                  <IconProjectsList />
                </RailNavLink>
              </>
            ) : null}
            {showPortfolioNav ? (
              <AppShellRailNavSection label="Portfolio">
                {portfolioOverviewHref != null ? (
                  <RailNavLink
                    href={portfolioOverviewHref}
                    active={activeNav === "portfolioOverview"}
                    label="Portfolio Overview"
                  >
                    <IconLayers />
                  </RailNavLink>
                ) : null}
                {portfolioProjectsHref != null ? (
                  <RailNavLink
                    href={portfolioProjectsHref}
                    active={activeNav === "portfolioProjects"}
                    label="Projects"
                  >
                    <IconProjectsList />
                  </RailNavLink>
                ) : null}
                {portfolioSettingsHref != null ? (
                  <RailNavLink
                    href={portfolioSettingsHref}
                    active={activeNav === "portfolioSettings"}
                    label="Portfolio Settings"
                  >
                    <IconSettings />
                  </RailNavLink>
                ) : null}
              </AppShellRailNavSection>
            ) : null}
            {projectOverviewHref != null ? (
              <AppShellRailNavSection label="Projects">
                <RailNavLink
                  href={projectOverviewHref}
                  active={activeNav === "projectOverview"}
                  label="Project Overview"
                >
                  <IconProjectOverview />
                </RailNavLink>
                {risksHref != null ? (
                  <RailNavLink href={risksHref} active={activeNav === "risks"} label="Risks">
                    <IconRisks />
                  </RailNavLink>
                ) : null}
                {simulationHref != null ? (
                  <RailNavLink href={simulationHref} active={activeNav === "simulation"} label="Simulation">
                    <IconSimulation />
                  </RailNavLink>
                ) : null}
                {projectSettingsHref != null ? (
                  <RailNavLink
                    href={projectSettingsHref}
                    active={activeNav === "projectSettings"}
                    label="Project Settings"
                  >
                    <IconSettings />
                  </RailNavLink>
                ) : null}
              </AppShellRailNavSection>
            ) : null}
          </nav>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <RiskAiRailFooterHelp />
          <AppShellRailFooterAccount>
            <RiskAiRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
