import DevHealthPage from "../../../dev/health/page";

export default async function ProjectEngineHealthPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <DevHealthPage projectId={projectId} />;
}
