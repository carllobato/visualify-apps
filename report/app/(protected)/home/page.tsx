import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SelectWorkspacePageContent } from "@/components/workspace/SelectWorkspacePageContent";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";

export const dynamic = "force-dynamic";

export default async function ReportHomePage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const context = await resolveActiveReportWorkspaceContext(user.id);

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
