import { ProjectCostPageContent } from "@/components/project/cost/ProjectCostPageContent";
import { ProjectPageLayout } from "@/components/project/ProjectPageLayout";
import { loadCostModuleBudgetData } from "@/lib/cost/cost-budget-server";
import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export default async function ProjectCostPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [{ project }, budgetData] = await Promise.all([
    loadControlAIProjectPageContext(projectId),
    loadCostModuleBudgetData(projectId),
  ]);

  return (
    <ProjectPageLayout project={project} contentFullWidth>
      <ProjectCostPageContent projectId={projectId} budgetData={budgetData} />
    </ProjectPageLayout>
  );
}
