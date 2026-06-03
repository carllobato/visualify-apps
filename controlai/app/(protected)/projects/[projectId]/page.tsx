import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await loadControlAIProjectPageContext(projectId);

  return (
    <ProjectPageLayout project={project}>
      <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Project overview for this workspace. Open Cost, Time, Risk, Report, or Settings from the
        project navigation in the left rail.
      </p>
    </ProjectPageLayout>
  );
}
