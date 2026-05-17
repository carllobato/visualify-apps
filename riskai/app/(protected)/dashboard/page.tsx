import Link from "next/link";
import { Suspense } from "react";
import { OpenPortfolioOnboardingLink } from "@/components/onboarding/OpenPortfolioOnboardingLink";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import { GreetingHeader } from "@/components/GreetingHeader";
import { PROJECT_TILE_LIST_LINK_CLASSES, ProjectTile } from "@/components/dashboard/ProjectTile";
import { DashboardAccessBanner } from "@/components/dashboard/DashboardAccessBanner";
import { DashboardSectionEmptyState } from "@/components/dashboard/DashboardSectionEmptyState";
import {
  getProjectTilePayloads,
  sortProjectTilesAlphabetically,
  type ProjectTilePayload,
} from "@/lib/dashboard/projectTileServerData";
import {
  formatWorkspaceList,
  getDashboardAccessContext,
} from "@/lib/dashboard/dashboardAccessContext";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { fetchPublicProfile, type PublicProfileRow } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import {
  WORKSPACE_INVITE_ACCEPTED_QP,
  WORKSPACE_SETUP_PORTFOLIO_QP,
} from "@/lib/onboarding/types";
import { Callout } from "@visualify/design-system";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(params: SearchParams, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const showPostWorkspaceInvite =
    getSearchParam(resolvedSearchParams, WORKSPACE_INVITE_ACCEPTED_QP) === "1";
  const suggestPortfolioSetup =
    getSearchParam(resolvedSearchParams, WORKSPACE_SETUP_PORTFOLIO_QP) === "1";

  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const devBypass = isDevAuthBypassEnabled();

  let portfolios = [] as Awaited<ReturnType<typeof getDashboardAccessContext>>["portfolios"];
  let projects = [] as Awaited<ReturnType<typeof getDashboardAccessContext>>["projects"];
  let projectTiles: ProjectTilePayload[] = [];
  let profileRow: PublicProfileRow | null = null;
  let hasAppAccess = false;
  let isWorkspaceAdmin = false;
  let workspaces: Awaited<ReturnType<typeof getDashboardAccessContext>>["workspaces"] = [];

  if (user) {
    const [access, profile] = await Promise.all([
      getDashboardAccessContext(supabase, user.id),
      fetchPublicProfile(supabase, user.id),
    ]);
    profileRow = profile;
    hasAppAccess = access.hasAppAccess;
    isWorkspaceAdmin = access.isWorkspaceAdmin;
    workspaces = access.workspaces;
    portfolios = [...access.portfolios].sort((a, b) =>
      (a.name || a.id).toLocaleLowerCase().localeCompare((b.name || b.id).toLocaleLowerCase()),
    );
    projects = access.projects;
    projectTiles = sortProjectTilesAlphabetically(
      (await getProjectTilePayloads(supabase, projects)).projectTilePayloads,
    );
  }

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const rawFirst = profileRow?.first_name ?? meta?.first_name;
  const dashboardFirstName =
    typeof rawFirst === "string" && rawFirst.trim() ? rawFirst.trim() : null;

  const workspaceLabel = formatWorkspaceList(workspaces);
  const showAccessExplainer =
    hasAppAccess && portfolios.length === 0 && !showPostWorkspaceInvite;

  const portfolioLauncherGridClass =
    "ds-dashboard-portfolio-grid" +
    (portfolios.length >= 2 ? " ds-dashboard-portfolio-grid--multi" : "");

  return (
    <div className="ds-dashboard-page">
      {devBypass && !user ? (
        <Callout status="warning" className="mb-[var(--ds-space-5)] text-[length:var(--ds-text-sm)]">
          <span className="font-medium">Dev preview:</span> no Supabase session. Remove{" "}
          <code className="rounded bg-[var(--ds-surface-muted)] px-1 font-mono text-[length:var(--ds-text-xs)]">
            DEV_SKIP_AUTH_GUARD=1
          </code>{" "}
          from <code className="font-mono text-[length:var(--ds-text-xs)]">.env.local</code> to test real sign-in.
          Project URLs still need a logged-in user (RLS).
        </Callout>
      ) : null}

      <Suspense fallback={null}>
        <DashboardAccessBanner
          workspaceLabel={workspaceLabel}
          isWorkspaceAdmin={isWorkspaceAdmin}
          showPostWorkspaceInvite={showPostWorkspaceInvite}
          suggestPortfolioSetup={suggestPortfolioSetup}
        />
      </Suspense>

      {showAccessExplainer ? (
        <Callout status="info" className="mb-[var(--ds-space-5)] text-[length:var(--ds-text-sm)]">
          <p className="m-0 leading-relaxed text-[var(--ds-text-secondary)]">
            <span className="font-medium text-[var(--ds-text-primary)]">App access is active</span> for{" "}
            {workspaceLabel}. Portfolios and projects listed below are assigned separately—an empty
            dashboard usually means you still need a portfolio or project invitation.
          </p>
        </Callout>
      ) : null}

      <GreetingHeader firstName={dashboardFirstName} />

      <section
        aria-labelledby="dashboard-portfolios-heading"
        className="mb-[var(--ds-space-8)]"
      >
        <div className="mb-[var(--ds-space-2)]">
          <h2 id="dashboard-portfolios-heading" className="ds-dashboard-section-heading">
            Portfolios
          </h2>
        </div>
        {portfolios.length === 0 ? (
          <DashboardSectionEmptyState
            kind="portfolios"
            hasAppAccess={hasAppAccess}
            workspaces={workspaces}
            isWorkspaceAdmin={isWorkspaceAdmin}
          />
        ) : (
          <div className="flex flex-col gap-[var(--ds-space-4)]">
            <ul className={portfolioLauncherGridClass}>
              {portfolios.map((p) => (
                <li key={p.id} className="min-w-0">
                  <Link href={riskaiPath(`/portfolios/${p.id}`)} className={PROJECT_TILE_LIST_LINK_CLASSES}>
                    <span className="ds-dashboard-launcher-primary">{p.name || p.id}</span>
                    <span className="ds-dashboard-launcher-chevron">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <OpenPortfolioOnboardingLink className="ds-dashboard-inline-create">
              <span className="ds-dashboard-inline-create-label">Create portfolio</span>
              <span className="ds-dashboard-inline-create-plus" aria-hidden>
                +
              </span>
            </OpenPortfolioOnboardingLink>
          </div>
        )}
      </section>

      <section aria-labelledby="dashboard-projects-heading">
        <div className="mb-[var(--ds-space-2)]">
          <h2 id="dashboard-projects-heading" className="ds-dashboard-section-heading">
            Projects
          </h2>
        </div>
        {projects.length === 0 ? (
          <DashboardSectionEmptyState
            kind="projects"
            hasAppAccess={hasAppAccess}
            workspaces={workspaces}
            isWorkspaceAdmin={isWorkspaceAdmin}
          />
        ) : (
          <div className="flex flex-col gap-[var(--ds-space-4)]">
            <div className="ds-dashboard-project-grid">
              {projectTiles.map((payload) => (
                <ProjectTile key={payload.id} payload={payload} />
              ))}
            </div>
            <OpenProjectOnboardingLink className="ds-dashboard-inline-create">
              <span className="ds-dashboard-inline-create-label">Create project</span>
              <span className="ds-dashboard-inline-create-plus" aria-hidden>
                +
              </span>
            </OpenProjectOnboardingLink>
          </div>
        )}
      </section>
    </div>
  );
}
