import { MinimalResourceListError } from "@/components/MinimalResourceListError";
import { ProjectsPageContent } from "@/components/project/ProjectsPageContent";
import {
  getAccessibleControlAIPortfolios,
  getAccessibleControlAIProjects,
} from "@/lib/portfolios-server";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <MinimalResourceListError title="Projects" message="Sign in to view projects." />
    );
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId;
  const hasActiveWorkspace = Boolean(activeWorkspaceId?.trim());

  const portfoliosResult = await getAccessibleControlAIPortfolios(
    supabase,
    user.id,
    activeWorkspaceId,
  );

  if (!portfoliosResult.ok) {
    return (
      <MinimalResourceListError
        title="Projects"
        message="Could not load projects. Please try again later."
      />
    );
  }

  const portfolioIds = portfoliosResult.portfolios.map((p) => p.id);
  const projectsResult = await getAccessibleControlAIProjects(
    supabase,
    user.id,
    portfolioIds,
    activeWorkspaceId,
  );

  if (!projectsResult.ok) {
    return (
      <MinimalResourceListError
        title="Projects"
        message="Could not load projects. Please try again later."
      />
    );
  }

  return (
    <ProjectsPageContent
      projects={projectsResult.projects}
      portfolios={portfoliosResult.portfolios}
      hasActiveWorkspace={hasActiveWorkspace}
    />
  );
}
