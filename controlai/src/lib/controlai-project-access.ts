import "server-only";

import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAccessibleControlAIPortfolios,
  getAccessibleControlAIProjects,
  type AccessibleProject,
} from "@/lib/portfolios-server";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";

/**
 * Server-only: resolves a ControlAI project the user may access in the active workspace.
 * Calls `notFound()` when the project is missing or inaccessible.
 */
export async function requireAccessibleControlAIProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<AccessibleProject> {
  const workspaceContext = await resolveActiveWorkspaceContext(supabase, userId);

  const portfoliosResult = await getAccessibleControlAIPortfolios(
    supabase,
    userId,
    workspaceContext.selectedWorkspaceId,
  );
  if (!portfoliosResult.ok) {
    notFound();
  }

  const portfolioIds = portfoliosResult.portfolios.map((p) => p.id);
  const projectsResult = await getAccessibleControlAIProjects(
    supabase,
    userId,
    portfolioIds,
    workspaceContext.selectedWorkspaceId,
  );
  if (!projectsResult.ok) {
    notFound();
  }

  const project = projectsResult.projects.find((p) => p.id === projectId);
  if (!project) {
    notFound();
  }

  return project;
}
