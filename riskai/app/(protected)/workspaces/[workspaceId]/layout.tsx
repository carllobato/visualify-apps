import { supabaseServerClient } from "@/lib/supabase/server";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { PageHeaderExtrasProvider } from "@/contexts/PageHeaderExtrasContext";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { riskaiPath } from "@/lib/routes";
import { resolveWorkspaceOverviewContext } from "@/lib/workspace/resolveWorkspaceOverviewContext";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(riskaiPath("/not-found"));
  }

  const overview = await resolveWorkspaceOverviewContext(workspaceId, user.id);
  if (!overview.ok) {
    redirect(riskaiPath("/not-found"));
  }

  const initialUrlSearch = (await headers()).get("x-url-search") ?? "";

  return (
    <PageHeaderExtrasProvider>
      <WorkspacePageHeader
        workspaceId={overview.workspace.id}
        workspaceName={overview.workspace.name}
        projectIds={overview.projects.map((project) => project.id)}
        initialUrlSearch={initialUrlSearch}
      />
      {children}
    </PageHeaderExtrasProvider>
  );
}
