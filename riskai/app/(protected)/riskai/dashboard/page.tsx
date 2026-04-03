import Link from "next/link";
import { GreetingHeader } from "@/components/GreetingHeader";
import { NewProjectTile, ProjectTile } from "@/components/dashboard/ProjectTile";
import {
  getProjectTilePayloads,
  sortProjectTilesByRag,
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
    const portfolioIds = portfolios.map((p) => p.id);
    const projectsResult = await getAccessibleProjects(supabase, user.id, portfolioIds);
    projects = projectsResult.ok ? projectsResult.projects : [];
    projectTiles = projectsResult.ok
      ? sortProjectTilesByRag(await getProjectTilePayloads(supabase, projects))
      : [];
  }

  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const rawFirst = profileRow?.first_name ?? meta?.first_name;
  const dashboardFirstName =
    typeof rawFirst === "string" && rawFirst.trim() ? rawFirst.trim() : null;

  return (
    <div className="w-full px-4 py-10 sm:px-6">
      {devBypass && !user ? (
        <Callout status="warning" className="mb-6 text-[length:var(--ds-text-sm)]">
          <span className="font-medium">Dev preview:</span> no Supabase session. Remove{" "}
          <code className="rounded bg-[var(--ds-surface-muted)] px-1 font-mono text-[length:var(--ds-text-xs)]">
            DEV_SKIP_AUTH_GUARD=1
          </code>{" "}
          from <code className="font-mono text-[length:var(--ds-text-xs)]">.env.local</code> to test real sign-in.
          Project URLs still need a logged-in user (RLS).
        </Callout>
      ) : null}
      <GreetingHeader firstName={dashboardFirstName} />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium text-[var(--ds-text-primary)]">Portfolios</h2>
        {portfolios.length === 0 ? (
          <Card variant="inset" className="text-center">
            <CardBody className="py-8">
              <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
                No portfolios yet
              </p>
              <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                Create a portfolio to organise your projects. If you&apos;re seeing this by mistake, refresh the page.
              </p>
              <Link
                href={riskaiPath("/onboarding/portfolio")}
                className="mt-6 inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-md)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] shadow-[var(--ds-shadow-sm)] hover:brightness-[1.07] active:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
              >
                Create portfolio
              </Link>
            </CardBody>
          </Card>
        ) : (
          <ul className="space-y-2">
            {portfolios.map((p) => (
              <li key={p.id}>
                <Link
                  href={riskaiPath(`/portfolios/${p.id}`)}
                  className="group flex h-14 items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] bg-[var(--ds-surface-elevated)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-tile)] outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:shadow-[var(--ds-elevation-tile-hover)] dark:border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-background)]"
                >
                  <span className="font-medium">{p.name || p.id}</span>
                  <span className="ml-2 text-sm text-[var(--ds-text-muted)]">Open portfolio →</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={riskaiPath("/onboarding/portfolio")}
                aria-label="Create a new portfolio"
                className="group flex h-14 items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] border-dashed bg-[var(--ds-background)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-none outline-none transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-px hover:border-[var(--ds-risk-low-border)] hover:bg-[var(--ds-risk-low-soft-bg)] hover:shadow-none dark:border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] dark:bg-[var(--ds-background)] dark:hover:border-[var(--ds-risk-low-border)] dark:hover:bg-[color-mix(in_oklab,var(--ds-risk-low)_14%,var(--ds-surface-default))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-background)]"
              >
                <span className="font-medium">New portfolio</span>
                <span className="ml-2 text-sm text-[var(--ds-text-muted)]">Create portfolio +</span>
              </Link>
            </li>
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-[var(--ds-text-primary)]">Projects</h2>
        {projects.length === 0 ? (
          <Card variant="inset" className="text-center">
            <CardBody className="py-8">
              {portfolios.length === 0 ? (
                <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                  You don&apos;t have any projects yet. Create a portfolio first if you need to start your own workspace,
                  or ask to be added to a project you collaborate on.
                </p>
              ) : (
                <>
                  <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
                    No projects yet
                  </p>
                  <p className="m-0 mt-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    Create a project to open the risk register and simulations.
                  </p>
                </>
              )}
              {portfolios.length > 0 ? (
                <Link
                  href={
                    portfolios[0]?.id
                      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolios[0].id)}`
                      : riskaiPath("/create-project")
                  }
                  className="mt-6 inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-md)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] shadow-[var(--ds-shadow-sm)] hover:brightness-[1.07] active:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                >
                  Create your first project
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projectTiles.map((payload) => (
              <ProjectTile key={payload.id} payload={payload} />
            ))}
            {portfolios.length > 0 ? (
              <NewProjectTile portfolioId={portfolios[0]?.id ?? null} />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
