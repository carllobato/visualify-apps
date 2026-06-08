import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ReportWorkspaceSelectionSkeleton } from "@/components/loading/ReportWorkspaceSelectionSkeleton";
import { SelectWorkspacePageContent } from "@/components/workspace/SelectWorkspacePageContent";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import { reportDefaultPostLoginPath, reportReturnPathAfterWorkspaceSelection } from "@/lib/report-routes";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";

export const dynamic = "force-dynamic";

type ReportHomePageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ReportHomePage({ searchParams }: ReportHomePageProps) {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const context = await resolveActiveReportWorkspaceContext(user.id);

  if (context.workspaces.length === 1) {
    const { next } = await searchParams;
    redirect(
      next?.trim()
        ? reportReturnPathAfterWorkspaceSelection(next)
        : reportDefaultPostLoginPath(),
    );
  }

  return (
    <Suspense fallback={<ReportWorkspaceSelectionSkeleton />}>
      <SelectWorkspacePageContent
        workspaces={context.workspaces}
        selectedWorkspaceId={context.selectedWorkspaceId}
        variant="home"
      />
    </Suspense>
  );
}
