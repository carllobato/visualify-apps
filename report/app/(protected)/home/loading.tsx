import { ReportWorkspaceSelectionSkeleton } from "@/components/loading/ReportWorkspaceSelectionSkeleton";

/** Fallback while the workspace picker route loads. */
export default function HomeRouteLoading() {
  return <ReportWorkspaceSelectionSkeleton />;
}
