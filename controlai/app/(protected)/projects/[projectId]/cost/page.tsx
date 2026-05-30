import { ProjectCostPageContent } from "@/components/project/cost/ProjectCostPageContent";
import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectCostPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout project={project}>
      <ProjectCostPageContent />
    </ProjectPageLayout>
  );
}
