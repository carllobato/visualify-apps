import { notFound } from "next/navigation";
import { ReportProjectReportPageContent } from "@/components/project/report/ReportProjectReportPageContent";
import { getReportWorkspaceProjectById } from "@/lib/projects/report-projects-server";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { projectId } = await params;
  const { period } = await searchParams;
  const user = await resolveAuthenticatedUser();

  if (!user) {
    notFound();
  }

  const supabase = await supabaseServerClient();

  const workspaceContext = await resolveActiveReportWorkspaceContext(user.id);
  const project = await getReportWorkspaceProjectById(
    supabase,
    user.id,
    workspaceContext.selectedWorkspaceId,
    projectId,
  );

  if (!project) {
    notFound();
  }

  return (
    <ReportProjectReportPageContent
      project={project}
      workspaceId={workspaceContext.selectedWorkspaceId}
      periodParam={period ?? null}
    />
  );
}
