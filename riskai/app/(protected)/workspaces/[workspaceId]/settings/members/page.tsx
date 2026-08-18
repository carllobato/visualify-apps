import { redirect } from "next/navigation";
import { fetchWorkspaceMemberRole } from "@/lib/db/workspaceMemberAccess";
import { riskaiPath } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import { listActiveWorkspaceMembers } from "@/lib/workspace/listActiveWorkspaceMembers";
import { resolveWorkspaceSettingsScope } from "@/lib/workspace/resolveWorkspaceSettingsScope";
import { workspaceRoleCanViewWorkspaceMembers } from "@/lib/workspace/workspaceRoleCapabilities";
import { WorkspaceSettingsMembersContent } from "../../WorkspaceSettingsMembersContent";

/**
 * Workspace Settings — Members: `/workspaces/[workspaceId]/settings/members`.
 * Read-only list of active Workspace members. Access uses the Workspace
 * entitlement gate plus an active membership check.
 */
export default async function WorkspaceMembersSettingsPage({
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
  if (!workspaceRoleCanViewWorkspaceMembers(workspaceRole)) {
    redirect(riskaiPath("/not-found"));
  }

  const listed = await listActiveWorkspaceMembers(supabase, settings.workspaceId);

  return (
    <WorkspaceSettingsMembersContent
      workspaceId={settings.workspaceId}
      currentUserId={user.id}
      members={listed.ok ? listed.members : []}
      loadError={listed.ok ? null : listed.error}
    />
  );
}
