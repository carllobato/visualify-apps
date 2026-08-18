import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WorkspaceSelectionEntryScreen } from "@/components/workspace/WorkspaceSelectionEntryScreen";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Signed-in workspace selector and Create Workspace entry.
 * Zero-Workspace users land here. Brand mark returns here after a Workspace is open.
 * Create Workspace stays available regardless of current Workspace role or count.
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

