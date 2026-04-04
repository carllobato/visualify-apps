import Link from "next/link";
import { GreetingHeader } from "@/components/GreetingHeader";
import { PROJECT_TILE_LIST_LINK_CLASSES, ProjectTile } from "@/components/dashboard/ProjectTile";
import {
  getProjectTilePayloads,
  sortProjectTilesAlphabetically,
  type ProjectTilePayload,
} from "@/lib/dashboard/projectTileServerData";
import type { AccessiblePortfolio, AccessibleProject } from "@/lib/portfolios-server";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { getAccessiblePortfolios, getAccessibleProjects } from "@/lib/portfolios-server";
import { fetchPublicProfile, type PublicProfileRow } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import { Callout, Card, CardBody } from "@visualify/design-system";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const devBypass = isDevAuthBypassEnabled();

  let portfolios: AccessiblePortfolio[] = [];
  let projects: AccessibleProject[] = [];
  let projectTiles: ProjectTilePayload[] = [];
  let profileRow: PublicProfileRow | null = null;

  if (user) {
    const [portfoliosResult, profile] = await Promise.all([
      getAccessiblePortfolios(supabase, user.id),
      fetchPublicProfile(supabase, user.id),
    ]);
    profileRow = profile;
    portfolios = portfoliosResult.ok ? portfoliosResult.portfolios : [];
    portfolios = [...portfolios].sort((a, b) =>
      (a.name || a.id).toLocaleLowerCase().localeCompare((b.name || b.id).toLocaleLowerCase())
    );
    const portfolioIds = portfolios.map((p) => p.id);
    const projectsResult = await getAccessibleProjects(supabase, user.id, portfolioIds);
    projects = projectsResult.ok ? projectsResult.projects : [];
    projectTiles = projectsResult.ok
      ? sortProjectTilesAlphabetically(await getProjectTilePayloads(supabase, projects))
      : [];
  }

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const rawFirst = profileRow?.first_name ?? meta?.first_name;
  const dashboardFirstName =
    typeof rawFirst === "string" && rawFirst.trim() ? rawFirst.trim() : null;

  const portfolioLauncherGridClass =
    "ds-dashboard-portfolio-grid" +
    (portfolios.length >= 2 ? " ds-dashboard-portfolio-grid--multi" : "");

  const createProjectHref =
    portfolios[0]?.id != null && portfolios[0].id !== ""
      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolios[0].id)}`
      : riskaiPath("/create-project");

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
          <Card variant="inset" className="text-center">
            <CardBody className="py-[var(--ds-space-6)]">
              <p className="ds-dashboard-empty-title">No portfolios yet</p>
              <Link href={riskaiPath("/onboarding/portfolio")} className="ds-dashboard-empty-primary">
                Create portfolio
              </Link>
            </CardBody>
          </Card>
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
            <Link href={riskaiPath("/onboarding/portfolio")} className="ds-dashboard-inline-create">
              <span className="ds-dashboard-inline-create-label">Create portfolio</span>
              <span className="ds-dashboard-inline-create-plus" aria-hidden>
                +
              </span>
            </Link>
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
          <Card variant="inset" className="text-center">
            <CardBody className="py-[var(--ds-space-6)]">
              <p className="ds-dashboard-empty-title">No projects yet</p>
              {portfolios.length > 0 ? (
                <Link
                  href={
                    portfolios[0]?.id
                      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolios[0].id)}`
                      : riskaiPath("/create-project")
                  }
                  className="ds-dashboard-empty-primary"
                >
                  Create project
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-[var(--ds-space-4)]">
            <div className="ds-dashboard-project-grid">
              {projectTiles.map((payload) => (
                <ProjectTile key={payload.id} payload={payload} />
              ))}
            </div>
            {portfolios.length > 0 ? (
              <Link
                href={createProjectHref}
                aria-label="Create project"
                className="ds-dashboard-inline-create"
              >
                <span className="ds-dashboard-inline-create-label">Create project</span>
                <span className="ds-dashboard-inline-create-plus" aria-hidden>
                  +
                </span>
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
