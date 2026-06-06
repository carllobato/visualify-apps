import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellOuterCanvas } from "@visualify/app-shell";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { getReportWorkspaceProjects } from "@/lib/projects/report-projects-server";
import { productConfig } from "@/lib/product-config";
import { REPORT_DEFAULT_ROUTE, REPORT_ROUTES } from "@/lib/report-routes";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ReportAppShellRail } from "@/components/layout/ReportAppShellRail";
import { ReportProtectedDocument } from "@/components/layout/ReportProtectedDocument";

function isSelectWorkspacePath(pathname: string): boolean {
  return (
    pathname === REPORT_ROUTES.selectWorkspace ||
    pathname.startsWith(`${REPORT_ROUTES.selectWorkspace}/`)
  );
}

function buildSelectWorkspaceRedirectUrl(returnPath: string): string {
  const next = encodeURIComponent(returnPath);
  return `${REPORT_ROUTES.selectWorkspace}?next=${next}`;
}

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = (await headers()).get("x-pathname") ?? REPORT_DEFAULT_ROUTE;

  if (!user) {
    redirect(buildLoginRedirectUrl(pathname));
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(supabase, user.id);

  if (workspaceContext.needsSelection && !isSelectWorkspacePath(pathname)) {
    redirect(buildSelectWorkspaceRedirectUrl(pathname));
  }

  const projectsResult = await getReportWorkspaceProjects(
    supabase,
    user.id,
    workspaceContext.selectedWorkspaceId,
  );
  const projects = projectsResult.ok ? projectsResult.projects : [];

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <ReportAppShellRail
        workspaces={workspaceContext.workspaces}
        selectedWorkspaceId={workspaceContext.selectedWorkspaceId}
        projects={projects}
      />
      <ReportProtectedDocument projects={projects}>{children}</ReportProtectedDocument>
    </AppShellOuterCanvas>
  );
}
