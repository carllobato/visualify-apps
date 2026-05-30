import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout project={project}>
      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Project settings for this workspace will be available here.
      </p>
    </ProjectPageLayout>
  );
}
