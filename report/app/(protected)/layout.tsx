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
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          You do not have access to Report for this workspace.
        </h1>
        <p className="text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          Ask a workspace owner to enable Report access or switch workspace in HQ.
        </p>
        <a
          href={productConfig.HQ_APPS_URL}
          className="inline-flex h-10 items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-primary)] px-4 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-primary-text)] no-underline hover:bg-[var(--ds-primary-hover)]"
        >
          Open HQ Apps
        </a>
      </main>
    );
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
    <AppShellOuterCanvas mobileHeaderExpected className="report-mobile-outer-canvas">
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
