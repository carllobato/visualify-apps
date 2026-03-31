import { RegisterPageHeaderTitle } from "@/components/RegisterPageHeaderTitle";
import { supabaseServerClient } from "@/lib/supabase/server";
import {
  RISK_STATUS_CLOSED_LOOKUP,
  RISK_STATUS_ARCHIVED_LOOKUP,
} from "@/domain/risk/riskFieldSemantics";
import { PortfolioOverviewContent } from "./PortfolioOverviewContent";

export default async function PortfolioOverviewPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();

  const { count: projectCount } = await supabase
    .from("visualify_projects")
    .select("id", { count: "exact", head: true })
    .eq("portfolio_id", portfolioId);

  const { data: projectRows } = await supabase
    .from("visualify_projects")
    .select("id")
    .eq("portfolio_id", portfolioId);

  const projectIds = (projectRows ?? []).map((p) => p.id as string);

  let activeRiskCount = 0;
  if (projectIds.length > 0) {
    const { count } = await supabase
      .from("riskai_risks")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds)
      .neq("status", RISK_STATUS_CLOSED_LOOKUP)
      .neq("status", RISK_STATUS_ARCHIVED_LOOKUP);
    activeRiskCount = count ?? 0;
  }

  return (
    <>
      <RegisterPageHeaderTitle titleSuffix="Overview" />
      <PortfolioOverviewContent
        projectCount={projectCount ?? 0}
        activeRiskCount={activeRiskCount}
      />
    </>
  );
}
