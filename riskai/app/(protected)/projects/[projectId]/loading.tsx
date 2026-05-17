import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/**
 * Project segment fallback while the active child page loads (overview, risk register, settings, etc.).
 */
export default function ProjectRouteLoading() {
  return <NeutralRiskaiLoading srLabel="Loading project" />;
}
