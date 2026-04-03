import { redirect } from "next/navigation";
import { assertProjectAccess } from "@/lib/auth/assertProjectAccess";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { PageHeader } from "@/components/PageHeader";
import { PageHeaderExtrasProvider } from "@/contexts/PageHeaderExtrasContext";
import { ProjectPermissionsProvider } from "@/contexts/ProjectPermissionsContext";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { SetActiveProjectClient } from "./SetActiveProjectClient";
import { supabaseServerClient } from "@/lib/supabase/server";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const ACTIVE_PROJECT_KEY = "activeProjectId";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await assertProjectAccess(projectId);
  if ("error" in access && access.error === "unauthorized") {
    if (isDevAuthBypassEnabled()) {
      redirect(DASHBOARD_PATH);
    }
    const pathname = (await headers()).get("x-pathname") ?? "/";
    redirect(await buildLoginRedirectUrl(pathname));
  }
  if ("error" in access && access.error === "forbidden") {
    redirect(riskaiPath("/not-found"));
  }

  const { project, permissions, portfolioId } = access;

  let portfolioName: string | null = null;
  if (portfolioId) {
    const supabase = await supabaseServerClient();
    const { data: portfolio } = await supabase
      .from("visualify_portfolios")
      .select("name")
      .eq("id", portfolioId)
      .single();
    portfolioName = portfolio?.name ?? null;
  }

  return (
    <ProjectPermissionsProvider permissions={permissions}>
      <PageHeaderExtrasProvider>
        <SetActiveProjectClient projectId={projectId} storageKey={ACTIVE_PROJECT_KEY} />
        <PageHeader
          projectId={projectId}
          projectName={project.name}
          portfolioId={portfolioId}
          portfolioName={portfolioName}
        />
        {children}
      </PageHeaderExtrasProvider>
    </ProjectPermissionsProvider>
  );
}
