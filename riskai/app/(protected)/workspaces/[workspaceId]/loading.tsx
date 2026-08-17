import { NeutralRiskaiLoading } from "@/components/NeutralRiskaiLoading";

/**
 * Workspace segment fallback while the overview page loads.
 * Keeps `WorkspacePageHeader` from the layout visible; only this slot shows the neutral loader.
 */
export default function WorkspaceRouteLoading() {
  return <NeutralRiskaiLoading srLabel="Loading workspace" />;
}
