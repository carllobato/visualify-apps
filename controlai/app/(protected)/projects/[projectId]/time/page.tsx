import { ProjectTimePageContent } from "@/components/project/time/ProjectTimePageContent";
import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectTimePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout project={project}>
      <ProjectTimePageContent />
    </ProjectPageLayout>
  );
}
