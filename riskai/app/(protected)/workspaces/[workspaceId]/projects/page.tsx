import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectTile } from "@/components/dashboard/ProjectTile";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import { loadProjectTilePayloads } from "@/lib/dashboard/projectTileServerData";
import { resolveWorkspaceProjectCreateParent } from "@/lib/project/resolveWorkspaceProjectCreateParent";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import { userCanCreateProjectInWorkspace } from "@/lib/workspace/creatableWorkspaces";
import { resolveWorkspaceOverviewContext } from "@/lib/workspace/resolveWorkspaceOverviewContext";
import { Card, CardBody } from "@visualify/design-system";

/**
 * Workspace Project list: `/workspaces/[workspaceId]/projects`.
 * Access and Project scope come from {@link resolveWorkspaceOverviewContext}
 * (`visualify_projects.workspace_id`, including `portfolio_id IS NULL`).
 */
export default async function WorkspaceProjectsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(riskaiPath("/not-found"));
  }

  const overview = await resolveWorkspaceOverviewContext(workspaceId, user.id);
  if (!overview.ok) {
    redirect(riskaiPath("/not-found"));
  }

  const canCreateWorkspaceProject = await userCanCreateProjectInWorkspace(
    supabase,
    user.id,
    overview.workspace.id,
  );
  const createParent = resolveWorkspaceProjectCreateParent({
    workspaceId: overview.workspace.id,
    uniquePortfolioId: overview.uniquePortfolio?.id ?? null,
  });
  const createWorkspaceId = "error" in createParent ? overview.workspace.id : createParent.workspaceId;
  const createPortfolioId = "error" in createParent ? null : createParent.portfolioId;

  const { projectTilePayloads: projectTiles } = await loadProjectTilePayloads(
    supabase,
    overview.projects,
    { onlyProjectsWithLockedReporting: false }
  );

  if (projectTiles.length === 0) {
    return (
      <main className="ds-document-page">
        <section aria-labelledby="workspace-projects-empty-heading">
          <Card variant="inset" className="mx-auto max-w-2xl border-0 text-center">
            <CardBody className="py-[var(--ds-space-6)]">
              <p id="workspace-projects-empty-heading" className="ds-dashboard-empty-title">
                No projects in this workspace yet
              </p>
              {canCreateWorkspaceProject ? (
                <OpenProjectOnboardingLink
                  className="ds-dashboard-empty-primary"
                  workspaceId={createWorkspaceId}
                  portfolioId={createPortfolioId}
                >
                  Create project
                </OpenProjectOnboardingLink>
              ) : null}
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
        </section>
      </main>
    );
  }

  return (
    <main className="ds-document-page">
      <section aria-labelledby="workspace-projects-heading">
        <p
          id="workspace-projects-heading"
          className="m-0 mb-6 max-w-3xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]"
        >
          Open a project for its overview, risk register, and simulation. Create a new project to add it to
          this workspace.
        </p>
        <div className="flex flex-col gap-[var(--ds-space-4)]">
          <div className="ds-dashboard-project-grid">
            {projectTiles.map((payload) => (
              <ProjectTile key={payload.id} payload={payload} />
            ))}
          </div>
          {canCreateWorkspaceProject ? (
            <OpenProjectOnboardingLink
              className="ds-dashboard-inline-create"
              workspaceId={createWorkspaceId}
              portfolioId={createPortfolioId}
            >
              <span className="ds-dashboard-inline-create-label">Create project</span>
              <span className="ds-dashboard-inline-create-plus" aria-hidden>
                +
              </span>
            </OpenProjectOnboardingLink>
          ) : null}
        </div>
      </section>
    </main>
  );
}
