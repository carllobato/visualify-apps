import { ReportProtectedRouteSkeleton } from "@/components/loading/ReportProtectedRouteSkeleton";

/** Fallback while protected Report routes load (post-login, account, etc.). */
export default function ProtectedRouteLoading() {
  return <ReportProtectedRouteSkeleton />;
}
