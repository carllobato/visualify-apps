import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WorkspaceSelectionEntryScreen } from "@/components/workspace/WorkspaceSelectionEntryScreen";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signed-in workspace selector. Reachable from the rail brand mark after a workspace
 * is already open, and used as the post-auth gate when no workspace cookie is set.
 * Always rendered so Create Workspace is available regardless of current Workspace role
 * or how many entitled Workspaces the user already has.
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

  return (
    <Suspense fallback={null}>
      <WorkspaceSelectionEntryScreen
        workspaces={context.workspaces}
        selectedWorkspaceId={context.selectedWorkspaceId}
      />
    </Suspense>
  );
}

