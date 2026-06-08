import { ReportProjectsListSkeleton } from "@/components/loading/ReportProjectsListSkeleton";

/**
 * Default protected-route fallback — matches the common post-login projects landing.
 */
export function ReportProtectedRouteSkeleton() {
  return <ReportProjectsListSkeleton />;
}
