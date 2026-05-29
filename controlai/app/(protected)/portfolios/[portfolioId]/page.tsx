import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessibleControlAIPortfolios } from "@/lib/portfolios-server";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCreatedDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const { portfolioId } = await params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);
  const result = await getAccessibleControlAIPortfolios(
    supabase,
    user.id,
    workspaceContext.selectedWorkspaceId,
  );
  if (!result.ok) {
    notFound();
  }

  const portfolio = result.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-8">
      <Link
        href="/portfolios"
        className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] no-underline hover:underline"
      >
        ← Portfolios
      </Link>
      <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
        {portfolio.name.trim() || "Untitled"}
      </h1>
      <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
        Created {formatCreatedDate(portfolio.created_at)}
      </p>
    </main>
  );
}
