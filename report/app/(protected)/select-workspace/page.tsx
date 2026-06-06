import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SelectWorkspacePageContent } from "@/components/workspace/SelectWorkspacePageContent";
import { REPORT_DEFAULT_ROUTE } from "@/lib/report-routes";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SelectWorkspacePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await resolveActiveReportWorkspaceContext(supabase, user.id);

  if (!context.needsSelection && context.selectedWorkspaceId) {
    redirect(REPORT_DEFAULT_ROUTE);
  }

  if (context.workspaces.length <= 1) {
    redirect(REPORT_DEFAULT_ROUTE);
  }

  return (
    <Suspense fallback={null}>
      <SelectWorkspacePageContent workspaces={context.workspaces} />
    </Suspense>
  );
}
