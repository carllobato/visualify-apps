import { redirect } from "next/navigation";
import { riskaiPath } from "@/lib/routes";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getRiskAiEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import { resolveWorkspaceSettingsScope } from "@/lib/workspace/resolveWorkspaceSettingsScope";
import { WorkspaceSettingsBillingContent } from "../../WorkspaceSettingsBillingContent";

/**
 * Workspace Settings — Billing placeholder: `/workspaces/[workspaceId]/settings/billing`.
 * Access uses the existing Workspace entitlement gate, not Portfolio membership.
 */
export default async function WorkspaceBillingSettingsPage({
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

  return <WorkspaceSettingsBillingContent workspaceId={settings.workspaceId} />;
}
