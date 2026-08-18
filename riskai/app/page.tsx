import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { HOME_PATH } from "@/lib/routes";
import { resolveRiskAiAuthenticatedLayoutState } from "@/lib/workspace/resolveRiskAiAuthenticatedEntry";
import { resolveActiveRiskAiWorkspaceContext } from "@/lib/workspace/resolveActiveRiskAiWorkspaceContext";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await headers();
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workspaceContext = await resolveActiveRiskAiWorkspaceContext(user.id);
  const entry = resolveRiskAiAuthenticatedLayoutState({
    pathname: "/",
    workspaceCount: workspaceContext.workspaces.length,
    selectedWorkspaceId: workspaceContext.selectedWorkspaceId,
    needsSelection: workspaceContext.needsSelection,
  });
  redirect(entry.redirectTo ?? HOME_PATH);
}
