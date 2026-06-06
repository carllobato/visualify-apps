import { notFound } from "next/navigation";
import { ReportProjectPageLayout } from "@/components/project/ReportProjectPageLayout";
import { ReportProjectReportPageContent } from "@/components/project/report/ReportProjectReportPageContent";
import { getReportWorkspaceProjectById } from "@/lib/projects/report-projects-server";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(supabase, user.id);
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
    <ReportProjectPageLayout project={project} contentFullWidth>
      <ReportProjectReportPageContent project={project} />
    </ReportProjectPageLayout>
  );
}
