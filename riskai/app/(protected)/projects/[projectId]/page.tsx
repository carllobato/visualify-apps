import { supabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadProjectReportingPageData } from "@/lib/project/loadProjectReportingPageData";
import { ProjectOverviewContent } from "./ProjectOverviewContent";

export default async function ProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const supabase = await supabaseServerClient();
  const initialUrlSearch = (await headers()).get("x-url-search") ?? "";

  const result = await loadProjectReportingPageData({
    supabase,
    projectId,
    searchParams: sp,
    pagePath: `/projects/${projectId}`,
    initialUrlSearch,
  });

  if (result.kind === "redirect") {
    redirect(result.url);
  }

  return <ProjectOverviewContent initialData={result.initialData} />;
}
