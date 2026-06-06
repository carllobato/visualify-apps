import { notFound } from "next/navigation";
import { Callout } from "@visualify/design-system";
import { ProjectsPageContent } from "@/components/projects/ProjectsPageContent";
import { getReportWorkspaceProjects } from "@/lib/projects/report-projects-server";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(supabase, user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId;
  const hasActiveWorkspace = Boolean(activeWorkspaceId?.trim());

  const result = await getReportWorkspaceProjects(supabase, user.id, activeWorkspaceId);

  if (!result.ok) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
            Projects
          </h1>
        </div>
        <Callout status="danger" role="alert">
          Could not load projects. Please try again later.
        </Callout>
      </main>
    );
  }

  return (
    <ProjectsPageContent projects={result.projects} hasActiveWorkspace={hasActiveWorkspace} />
  );
}
