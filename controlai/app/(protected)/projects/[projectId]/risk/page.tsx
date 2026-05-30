import { ProjectRiskPageContent } from "@/components/project/risk/ProjectRiskPageContent";
import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectRiskPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout project={project}>
      <ProjectRiskPageContent />
    </ProjectPageLayout>
  );
}
