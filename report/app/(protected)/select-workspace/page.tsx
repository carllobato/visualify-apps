import { redirect } from "next/navigation";
import { REPORT_ROUTES } from "@/lib/report-routes";

export const dynamic = "force-dynamic";

type SelectWorkspacePageProps = {
  searchParams: Promise<{ next?: string }>;
};

/** Legacy route — workspace selection lives on `/home`. */
export default async function SelectWorkspacePage({ searchParams }: SelectWorkspacePageProps) {
  const { next } = await searchParams;
  if (next) {
    redirect(`${REPORT_ROUTES.home}?next=${encodeURIComponent(next)}`);
  }
  redirect(REPORT_ROUTES.home);
}
