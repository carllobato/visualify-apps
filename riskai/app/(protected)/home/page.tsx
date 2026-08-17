import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WorkspaceSelectionEntryScreen } from "@/components/workspace/WorkspaceSelectionEntryScreen";
import { DASHBOARD_PATH, workspaceOverviewPath } from "@/lib/routes";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signed-in workspace selector. Reachable from the rail brand mark after a workspace
 * is already open, and used as the post-auth gate when no workspace cookie is set.
 */
export default async function RiskAiHomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await resolveActiveRiskAiWorkspaceContext(user.id);

  if (context.workspaces.length < 2) {
    const onlyWorkspace = context.workspaces[0];
    redirect(onlyWorkspace ? workspaceOverviewPath(onlyWorkspace.id) : DASHBOARD_PATH);
  }

  return (
    <Suspense fallback={null}>
      <WorkspaceSelectionEntryScreen
        workspaces={context.workspaces}
        selectedWorkspaceId={context.selectedWorkspaceId}
      />
    </Suspense>
  );
}

