import { redirect } from "next/navigation";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { riskaiPath } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import { resolveWorkspaceSettingsScope } from "@/lib/workspace/resolveWorkspaceSettingsScope";
import { canEditWorkspaceSettings } from "@/lib/workspace/workspaceSettingsUpdate";
import { WorkspaceSettingsContent } from "../WorkspaceSettingsContent";

/**
 * Workspace Settings: `/workspaces/[workspaceId]/settings`.
 * Access uses the existing Workspace entitlement gate, not Portfolio membership.
 * Identity is loaded from `visualify_workspaces`. Reporting unit uses that
 * Workspace value when set, otherwise the unique Portfolio fallback.
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

  const entitledWorkspaces = await getRiskAiEntitledWorkspaces(supabase, user.id);
  const settings = await resolveWorkspaceSettingsScope({
    supabase,
    workspaceId,
    entitledWorkspaces,
  });
  if (!settings.ok) {
    redirect(riskaiPath("/not-found"));
  }

  const workspaceRole = await fetchWorkspaceMemberRole(supabase, settings.workspaceId, user.id);

  return (
    <WorkspaceSettingsContent
      workspaceName={settings.workspaceName}
      workspaceId={settings.workspaceId}
      workspaceSlug={settings.workspaceSlug}
      reportingUnit={settings.reportingUnit}
      canEditWorkspaceDetails={canEditWorkspaceSettings(workspaceRole)}
    />
  );
}
