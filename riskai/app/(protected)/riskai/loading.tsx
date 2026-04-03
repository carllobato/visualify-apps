import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/**
 * Fallback for RiskAI routes that do not define their own `loading.tsx`.
 */
export default function RiskaiRouteLoading() {
  return <NeutralRiskaiLoading />;
}
