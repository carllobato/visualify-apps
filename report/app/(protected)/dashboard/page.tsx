import { redirect } from "next/navigation";
import { REPORT_ROUTES } from "@/lib/report-routes";

export const dynamic = "force-dynamic";

export default function DashboardRedirectPage() {
  redirect(REPORT_ROUTES.projects);
}
