import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/**
 * Portfolio segment fallback while the active child page loads (overview, projects list, settings).
 * Keeps `PortfolioPageHeader` from the layout visible; only this slot shows the neutral loader.
 */
export default function PortfolioRouteLoading() {
  return <NeutralRiskaiLoading srLabel="Loading portfolio" />;
}
