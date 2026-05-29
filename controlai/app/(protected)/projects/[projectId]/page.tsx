import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAccessibleControlAIPortfolios,
  getAccessibleControlAIProjects,
} from "@/lib/portfolios-server";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCreatedDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);

  const portfoliosResult = await getAccessibleControlAIPortfolios(
    supabase,
    user.id,
    workspaceContext.selectedWorkspaceId,
  );
  if (!portfoliosResult.ok) {
    notFound();
  }

  const portfolioIds = portfoliosResult.portfolios.map((p) => p.id);
  const projectsResult = await getAccessibleControlAIProjects(
    supabase,
    user.id,
    portfolioIds,
    workspaceContext.selectedWorkspaceId,
  );
  if (!projectsResult.ok) {
    notFound();
  }

  const project = projectsResult.projects.find((p) => p.id === projectId);
  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-8">
      <Link
        href="/projects"
        className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] no-underline hover:underline"
      >
        ← Projects
      </Link>
      <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
        {project.name.trim() || "Untitled"}
      </h1>
      <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Created {formatCreatedDate(project.created_at)}
      </p>
    </main>
  );
}
