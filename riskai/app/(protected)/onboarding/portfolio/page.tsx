import { redirect } from "next/navigation";
import { ONBOARDING_PORTFOLIO_QP } from "@/lib/onboarding/types";
import { riskaiPath } from "@/lib/routes";

/** Portfolio onboarding is the shell modal; this route deep-links the dashboard with the modal open. */
export default function PortfolioOnboardingPage() {
  redirect(`${riskaiPath("/dashboard")}?${ONBOARDING_PORTFOLIO_QP}=1`);
}
