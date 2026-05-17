import { notFound } from "next/navigation";
import { getProjectAccessForUser } from "@/lib/db/projectAccess";
import { supabaseServerClient } from "@/lib/supabase/server";
import RunDataPage from "../../../run-data/page";

export default async function ProjectRunDataPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const bundle = await getProjectAccessForUser(projectId, user.id);
  if (!bundle) notFound();

  return (
    <RunDataPage projectId={bundle.project.id} projectName={bundle.project.name} />
  );
}
