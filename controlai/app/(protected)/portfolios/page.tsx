import { MinimalResourceListError } from "@/components/MinimalResourceListError";
import { PortfoliosPageContent } from "@/components/portfolio/PortfoliosPageContent";
import { getAccessibleControlAIPortfolios } from "@/lib/portfolios-server";
import { getControlAIEntitledWorkspaces } from "@/lib/workspace/entitledWorkspaces";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <MinimalResourceListError title="Portfolios" message="Sign in to view portfolios." />
    );
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);

  const [result, workspaces] = await Promise.all([
    getAccessibleControlAIPortfolios(supabase, user.id, workspaceContext.selectedWorkspaceId),
    getControlAIEntitledWorkspaces(supabase, user.id),
  ]);

  if (!result.ok) {
    return (
      <MinimalResourceListError
        title="Portfolios"
        message="Could not load portfolios. Please try again later."
      />
    );
  }

  return <PortfoliosPageContent portfolios={result.portfolios} workspaces={workspaces} />;
}
