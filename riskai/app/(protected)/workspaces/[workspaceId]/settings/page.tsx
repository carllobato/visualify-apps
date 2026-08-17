import { redirect } from "next/navigation";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { riskaiPath } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceOverviewContext } from "@/lib/workspace/resolveWorkspaceOverviewContext";
import { resolveWorkspacePortfolioCapabilities } from "@/lib/workspace/workspaceRoleCapabilities";
import { WorkspaceSettingsContent } from "../WorkspaceSettingsContent";

/**
 * Workspace Settings: `/workspaces/[workspaceId]/settings`.
 * Access uses the existing Workspace entitlement gate, not Portfolio membership.
 */
export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(riskaiPath("/not-found"));
  }

  const overview = await resolveWorkspaceOverviewContext(workspaceId, user.id);
  if (!overview.ok) {
    redirect(riskaiPath("/not-found"));
  }

  const workspaceRole = await fetchWorkspaceMemberRole(supabase, overview.workspace.id, user.id);
  const canEditWorkspaceDetails = workspaceRole
    ? resolveWorkspacePortfolioCapabilities(workspaceRole).canEditPortfolioDetails
    : false;

  return (
    <WorkspaceSettingsContent
      workspaceName={overview.workspace.name}
      workspaceId={overview.workspace.id}
      workspaceSlug={overview.workspace.slug}
      reportingUnit={overview.reportingUnit}
      uniquePortfolioId={overview.uniquePortfolio?.id ?? null}
      canEditWorkspaceDetails={canEditWorkspaceDetails}
    />
  );
}
