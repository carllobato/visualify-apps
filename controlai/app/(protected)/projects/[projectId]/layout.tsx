import { loadControlAIProjectPageContext } from "@/lib/controlai-project-page-context";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await loadControlAIProjectPageContext(projectId);

  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
}
