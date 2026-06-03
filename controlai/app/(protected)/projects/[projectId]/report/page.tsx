import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { ReportHeaderReportingPeriodSelect } from "@/components/project/report/ReportHeaderReportingPeriodSelect";
import { ProjectReportPageContent } from "@/components/project/report/ProjectReportPageContent";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout
      project={project}
      contentFullWidth
      headerTrailing={<ReportHeaderReportingPeriodSelect />}
    >
      <ProjectReportPageContent />
    </ProjectPageLayout>
  );
}
