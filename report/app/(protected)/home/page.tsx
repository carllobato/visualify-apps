import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SelectWorkspacePageContent } from "@/components/workspace/SelectWorkspacePageContent";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportHomePage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const context = await resolveActiveReportWorkspaceContext(supabase, user.id);

  return (
    <Suspense fallback={null}>
      <SelectWorkspacePageContent
        workspaces={context.workspaces}
        selectedWorkspaceId={context.selectedWorkspaceId}
        variant="home"
      />
    </Suspense>
  );
}
