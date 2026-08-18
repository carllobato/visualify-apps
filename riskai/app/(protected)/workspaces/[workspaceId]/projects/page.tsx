import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectTile } from "@/components/dashboard/ProjectTile";
import { OpenProjectOnboardingLink } from "@/components/onboarding/OpenProjectOnboardingLink";
import { RestoreArchivedProjectButton } from "@/components/workspace/RestoreArchivedProjectButton";
import { loadProjectTilePayloads } from "@/lib/dashboard/projectTileServerData";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { resolveWorkspaceProjectCreateParent } from "@/lib/project/resolveWorkspaceProjectCreateParent";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";
import { userCanCreateProjectInWorkspace } from "@/lib/workspace/creatableWorkspaces";
import { resolveWorkspaceOverviewContext } from "@/lib/workspace/resolveWorkspaceOverviewContext";
import {
  loadWorkspaceArchivedProjects,
  type WorkspaceArchivedProject,
} from "@/lib/workspace/resolveWorkspaceOverviewScope";
import { workspaceRoleCanArchiveProject } from "@/lib/workspace/workspaceRoleCapabilities";
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
  const workspaceRole = await fetchWorkspaceMemberRole(supabase, overview.workspace.id, user.id);
  const canRestoreArchivedProjects = workspaceRoleCanArchiveProject(workspaceRole);
  const createParent = resolveWorkspaceProjectCreateParent({
    workspaceId: overview.workspace.id,
  });
  const createWorkspaceId = "error" in createParent ? overview.workspace.id : createParent.workspaceId;

  const { projectTilePayloads: projectTiles } = await loadProjectTilePayloads(
    supabase,
    overview.projects,
    { onlyProjectsWithLockedReporting: false }
  );
  const archivedProjects = canRestoreArchivedProjects
    ? await loadWorkspaceArchivedProjects(supabase, overview.workspace.id)
    : [];

  if (projectTiles.length === 0 && archivedProjects.length === 0) {
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
        {projectTiles.length === 0 ? (
          <p
            id="workspace-projects-heading"
            className="m-0 mb-6 max-w-3xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]"
          >
            No active projects in this workspace.
          </p>
        ) : (
          <p
            id="workspace-projects-heading"
            className="m-0 mb-6 max-w-3xl text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]"
          >
            Open a project for its overview, risk register, and simulation. Create a new project to add it to
            this workspace.
          </p>
        )}
        <div className="flex flex-col gap-[var(--ds-space-4)]">
          {projectTiles.length > 0 ? (
            <div className="ds-dashboard-project-grid">
              {projectTiles.map((payload) => (
                <ProjectTile key={payload.id} payload={payload} />
              ))}
            </div>
          ) : null}
          {canCreateWorkspaceProject ? (
            <OpenProjectOnboardingLink
              className="ds-dashboard-inline-create"
              workspaceId={createWorkspaceId}
            >
              <span className="ds-dashboard-inline-create-label">Create project</span>
              <span className="ds-dashboard-inline-create-plus" aria-hidden>
                +
              </span>
            </OpenProjectOnboardingLink>
          ) : null}
        </div>
      </section>
      <ArchivedProjectsSection projects={archivedProjects} />
    </main>
  );
}

function ArchivedProjectsSection({ projects }: { projects: WorkspaceArchivedProject[] }) {
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="workspace-archived-projects-heading" className="mt-10">
      <h2
        id="workspace-archived-projects-heading"
        className="m-0 mb-3 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]"
      >
        Archived projects
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-tile)] px-[1.125rem] py-3"
          >
            <span className="min-w-0 truncate font-medium text-[var(--ds-text-primary)]">
              {project.name || project.id}
            </span>
            <RestoreArchivedProjectButton projectId={project.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
