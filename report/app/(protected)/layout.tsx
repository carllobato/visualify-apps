import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShellOuterCanvas, AppShellPostLoginRevealEffect, buildEntitledAppShellCatalogForUser, type AppShellRailAppCatalogEntry } from "@visualify/app-shell";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
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
  const user = await resolveAuthenticatedUser();
  const pathname = (await headers()).get("x-pathname") ?? REPORT_DEFAULT_ROUTE;

  if (!user) {
    redirect(buildLoginRedirectUrl(pathname));
  }

  const supabase = await supabaseServerClient();

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    redirect(productConfig.HQ_APPS_URL);
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(user.id);
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
      : await getReportWorkspaceProjects(user.id, workspaceContext.selectedWorkspaceId);
  const projects = projectsResult?.ok ? projectsResult.projects : [];

  return (
    <AppShellOuterCanvas mobileHeaderExpected>
      <AppShellPostLoginRevealEffect />
      <ReportAppShellRail
        workspaces={workspaceContext.workspaces}
        selectedWorkspaceId={workspaceContext.selectedWorkspaceId}
        projects={projects}
        appCatalog={appCatalog}
        emptyPrimaryNav={onHome}
      />
      <ReportProtectedDocument projects={projects} selectedWorkspaceId={workspaceContext.selectedWorkspaceId}>
        {children}
      </ReportProtectedDocument>
    </AppShellOuterCanvas>
  );
}
