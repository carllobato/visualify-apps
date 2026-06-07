import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellOuterCanvas, buildEntitledAppShellCatalogForUser, type AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { getReportWorkspaceProjects } from "@/lib/projects/report-projects-server";
import { productConfig } from "@/lib/product-config";
import {
  isReportHomePath,
  isReportWorkspaceSelectionPath,
  REPORT_DEFAULT_ROUTE,
  REPORT_ROUTES,
} from "@/lib/report-routes";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";
import { ReportAppShellRail } from "@/components/layout/ReportAppShellRail";
import { ReportProtectedDocument } from "@/components/layout/ReportProtectedDocument";

function buildHomeRedirectUrl(returnPath: string): string {
  const next = encodeURIComponent(returnPath);
  return `${REPORT_ROUTES.home}?next=${next}`;
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
  const workspaceEntitledProductKeys = await fetchWorkspaceEntitledProductKeysForUser(supabase, user.id);
  const appCatalog: readonly AppShellRailAppCatalogEntry[] = buildEntitledAppShellCatalogForUser(
    workspaceEntitledProductKeys,
    user.email,
  );

  if (workspaceContext.needsSelection && !isReportWorkspaceSelectionPath(pathname)) {
    redirect(buildHomeRedirectUrl(pathname));
  }

  const onHome = isReportHomePath(pathname);
  const projectsResult =
    onHome || !workspaceContext.selectedWorkspaceId
      ? null
      : await getReportWorkspaceProjects(supabase, user.id, workspaceContext.selectedWorkspaceId);
  const projects = projectsResult?.ok ? projectsResult.projects : [];

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <ReportAppShellRail
        workspaces={workspaceContext.workspaces}
        selectedWorkspaceId={workspaceContext.selectedWorkspaceId}
        projects={projects}
        appCatalog={appCatalog}
        emptyPrimaryNav={onHome}
      />
      <ReportProtectedDocument projects={projects}>{children}</ReportProtectedDocument>
    </AppShellOuterCanvas>
  );
}
