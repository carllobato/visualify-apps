import Link from "next/link";
import { DASHBOARD_PATH } from "@/lib/routes";

/** Public marketing home for the website host (visualify.com.au). */
export function WelcomePage() {
  const signInHref = `/?next=${encodeURIComponent(DASHBOARD_PATH)}`;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ds-text-primary)]">Visualify RiskAI</h1>
        <p className="mt-3 text-[var(--ds-text-secondary)]">
          Model, analyse, and manage risk in one place. Sign in to open your portfolios and projects.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={signInHref}
          className="inline-flex rounded-md border border-[var(--ds-text-primary)] bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] no-underline hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/privacy"
          className="inline-flex rounded-md border border-[var(--ds-border)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="inline-flex rounded-md border border-[var(--ds-border)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-primary)] no-underline hover:bg-[var(--ds-surface-hover)]"
        >
          Terms
        </Link>
      </div>
    </main>
  );
}
