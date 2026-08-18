import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/routes";
import { resolveRiskAiAuthenticatedLayoutState } from "@/lib/workspace/resolveRiskAiAuthenticatedEntry";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Outside `(protected)`. Authenticated users are sent through Workspace resolution
 * instead of being denied for having zero Workspaces or no existing RiskAI
 * Workspace entitlement. Unauthenticated visitors still go to login.
 *
 * The route is kept so bookmarks and old links do not 404. There is no remaining
 * focused-MVP runtime case that should render a RiskAI access-denial screen.
 */
export default async function NoAccessPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceContext = await resolveActiveRiskAiWorkspaceContext(user.id);
  const entry = resolveRiskAiAuthenticatedLayoutState({
    pathname: "/no-access",
    workspaceCount: workspaceContext.workspaces.length,
    selectedWorkspaceId: workspaceContext.selectedWorkspaceId,
    needsSelection: workspaceContext.needsSelection,
  });
  redirect(entry.redirectTo ?? HOME_PATH);
}
