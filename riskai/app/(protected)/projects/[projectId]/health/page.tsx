import { redirect } from "next/navigation";

export default async function ProjectHealthPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/engine-health`);
}
