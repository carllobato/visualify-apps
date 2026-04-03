import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "@/lib/supabase/server";
import { riskaiPath } from "@/lib/routes";

type ProjectRow = { id: string; name: string; created_at: string | null };

/** Portfolio and project list access are enforced by Supabase RLS (owner or portfolio_members). */
export default async function PortfolioProjectsPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();

  const { data: portfolio, error: portfolioError } = await supabase
    .from("visualify_portfolios")
    .select("id, name")
    .eq("id", portfolioId)
    .single();

  if (portfolioError || !portfolio) {
    redirect(riskaiPath("/not-found"));
  }

  const { data: projects, error: projectsError } = await supabase
    .from("visualify_projects")
    .select("id, name, created_at")
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: true });

  const list: ProjectRow[] = projectsError ? [] : (projects ?? []);

  return (
    <>
      <main className="w-full px-4 py-10">
        <p className="text-sm text-[var(--ds-text-secondary)] mb-8">
          Projects in this portfolio.
        </p>

        {list.length === 0 ? (
          <div className="rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] p-6 text-center">
            <p className="text-sm text-[var(--ds-text-secondary)] mb-4">
              No projects in this portfolio yet.
            </p>
            <Link
              href={`${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolioId)}`}
              className="mb-3 inline-flex h-9 items-center justify-center rounded-[var(--ds-radius-md)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)] shadow-[var(--ds-shadow-sm)] hover:brightness-[1.07] active:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
            >
              Create project
            </Link>
            <div />
            <Link
              href={riskaiPath("/projects")}
              className="text-sm text-[var(--ds-text-primary)] underline hover:no-underline"
            >
              View all your projects
            </Link>
          </div>
        ) : (
          <ul className="space-y-2 mb-6">
            {list.map((p) => (
              <li key={p.id}>
                <Link
                  href={riskaiPath(`/projects/${p.id}`)}
                  className="group flex h-14 items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] bg-[var(--ds-surface-elevated)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-tile)] outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-[color-mix(in_oklab,var(--ds-border)_80%,transparent)] hover:shadow-[var(--ds-elevation-tile-hover)] dark:border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-background)]"
                >
                  <span className="font-medium">{p.name || p.id}</span>
                  <span className="ml-2 text-sm text-[var(--ds-text-muted)]">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolioId)}`}
                aria-label="Create a new project in this portfolio"
                className="group flex h-14 items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklab,var(--ds-border)_55%,transparent)] border-dashed bg-[var(--ds-background)] px-[1.125rem] text-[var(--ds-text-primary)] shadow-none outline-none transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-px hover:border-[var(--ds-risk-low-border)] hover:bg-[var(--ds-risk-low-soft-bg)] hover:shadow-none dark:border-[color-mix(in_oklab,var(--ds-border)_70%,transparent)] dark:bg-[var(--ds-background)] dark:hover:border-[var(--ds-risk-low-border)] dark:hover:bg-[color-mix(in_oklab,var(--ds-risk-low)_14%,var(--ds-surface-default))]"
              >
                <span className="font-medium">New project</span>
                <span className="ml-2 text-sm text-[var(--ds-text-muted)]">Create +</span>
              </Link>
            </li>
          </ul>
        )}
      </main>
    </>
  );
}
