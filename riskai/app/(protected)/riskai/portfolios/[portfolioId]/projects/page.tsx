import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectTile } from "@/components/dashboard/ProjectTile";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import {
  getProjectTilePayloads,
  sortProjectTilesAlphabetically,
} from "@/lib/dashboard/projectTileServerData";
import type { AccessibleProject } from "@/lib/portfolios-server";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import { Card, CardBody } from "@visualify/design-system";

type ProjectRow = { id: string; name: string; created_at: string | null };

/** Same shell rhythm as portfolio overview + project overview document column. */
const portfolioProjectsMainClass =
  "min-h-full w-full bg-transparent text-[var(--ds-text-primary)] px-4 sm:px-6 py-8";

/** Portfolio and project list access are enforced by Supabase RLS (owner or portfolio_members). */
export default async function PortfolioProjectsPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();

  const { data: portfolio, error: portfolioError } = await supabase
    .from("visualify_portfolios")
    .select("id, name")
    .eq("id", portfolioId)
    .single();

  if (portfolioError || !portfolio) {
    redirect(riskaiPath("/not-found"));
  }

  const { data: projects, error: projectsError } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: true });

  const list: ProjectRow[] = projectsError ? [] : (projects ?? []);
  const asAccessible: AccessibleProject[] = list.map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
  }));
  const projectTiles = sortProjectTilesAlphabetically(
    await getProjectTilePayloads(supabase, asAccessible)
  );

  return (
    <main className={portfolioProjectsMainClass}>
      <p className="m-0 mb-6 max-w-3xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
        Open a project for its overview, risk register, and simulation. Create a new project to add it to
        this portfolio.
      </p>

      {list.length === 0 ? (
        <Card variant="inset" className="mx-auto max-w-lg text-center">
          <CardBody className="py-[var(--ds-space-6)]">
            <p className="ds-dashboard-empty-title">No projects in this portfolio yet</p>
            <OpenProjectOnboardingLink className="ds-dashboard-empty-primary" portfolioId={portfolioId}>
              Create project
            </OpenProjectOnboardingLink>
            <div className="mt-5">
              <Link
                href={riskaiPath("/projects")}
                className="ds-text-link-muted text-[length:var(--ds-text-sm)]"
              >
                View all your projects
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--ds-space-4)]">
          <div className="ds-dashboard-project-grid">
            {projectTiles.map((payload) => (
              <ProjectTile key={payload.id} payload={payload} />
            ))}
          </div>
          <OpenProjectOnboardingLink
            className="ds-dashboard-inline-create"
            portfolioId={portfolioId}
          >
            <span className="ds-dashboard-inline-create-label">Create project</span>
            <span className="ds-dashboard-inline-create-plus" aria-hidden>
              +
            </span>
          </OpenProjectOnboardingLink>
        </div>
      )}
    </main>
  );
}
