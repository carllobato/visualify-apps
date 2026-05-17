import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { assertPortfolioAdminAccess } from "@/lib/portfolios-server";
import { ownerUsernameAndCompanyFromProfile, fetchPublicProfile } from "@/lib/profiles/profileDb";
import { riskaiPath } from "@/lib/routes";
import PortfolioSettingsContent from "../../../portfolio/PortfolioSettingsContent";

/** Portfolio settings: table owner or any portfolio member (owner / editor / viewer); non-members denied. */
export default async function PortfolioSettingsPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(riskaiPath("/not-found"));
  }

  const result = await assertPortfolioAdminAccess(
    portfolioId,
    supabase,
    user.id
  );

  if ("error" in result) {
    redirect(riskaiPath("/not-found"));
  }

  const { portfolio, ...memberCapabilities } = result;

  const ownerProfile = await fetchPublicProfile(supabase, portfolio.owner_user_id);
  const { username: ownerUsername, company: ownerCompany } =
    ownerUsernameAndCompanyFromProfile(ownerProfile);

  return (
    <>
      <PortfolioSettingsContent
        portfolioId={portfolioId}
        memberCapabilities={memberCapabilities}
        initial={{
          name: portfolio.name,
          description: portfolio.description,
          owner_username: ownerUsername,
          owner_company: ownerCompany,
          created_at: portfolio.created_at,
          reporting_currency: portfolio.reporting_currency,
          reporting_unit: portfolio.reporting_unit,
        }}
      />
    </>
  );
}
