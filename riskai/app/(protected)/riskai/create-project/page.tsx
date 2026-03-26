"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { riskaiPath } from "@/lib/routes";
import { Callout } from "@visualify/design-system";
import { LoadingPlaceholder, LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";

const ACTIVE_PROJECT_KEY = "activeProjectId";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PortfolioRow = { id: string; name: string };

function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramPortfolioId = searchParams.get("portfolioId");

  const [name, setName] = useState("");
  const [portfolios, setPortfolios] = useState<PortfolioRow[] | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portfolios");
        const json = (await res.json()) as { portfolios?: PortfolioRow[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadError(json.error ?? "Could not load portfolios.");
          return;
        }
        const list = json.portfolios ?? [];
        if (!cancelled && list.length === 0) {
          if (!cancelled) setLoadError("Create a portfolio first (from the dashboard or onboarding).");
          return;
        }
        if (cancelled) return;
        setPortfolios(list);
        const fromQuery =
          paramPortfolioId && UUID_REGEX.test(paramPortfolioId) ? paramPortfolioId : null;
        const validFromQuery = fromQuery && list.some((p) => p.id === fromQuery) ? fromQuery : null;
        setSelectedPortfolioId(validFromQuery ?? list[0]!.id);
      } catch {
        if (!cancelled) setLoadError("Could not load portfolios.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramPortfolioId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selectedPortfolioId) {
      setMessage({ type: "error", text: "Select a portfolio." });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ name, portfolioId: selectedPortfolioId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      project?: { id: string };
      error?: string;
    };
    if (!res.ok || !json.project) {
      setMessage({
        type: "error",
        text: json.error?.trim() || (res.status === 401 ? "Not signed in." : "Could not create project."),
      });
      setLoading(false);
      return;
    }
    const projectId = json.project.id;
    if (projectId) {
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
      } catch {
        // ignore
      }
      router.replace(riskaiPath(`/projects/${projectId}`));
      router.refresh();
      return;
    }
    setMessage({ type: "error", text: "Project created but could not redirect." });
    setLoading(false);
  };

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {loadError}
        </Callout>
        <Link
          href="/"
          className="mt-4 inline-block text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] underline"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (portfolios === null) {
    return (
      <main className="mx-auto flex min-h-[30vh] max-w-md flex-col justify-center px-4 py-12">
        <LoadingPlaceholder label="Loading portfolios" />
      </main>
    );
  }

  const selectClass =
    "w-full rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm text-[var(--ds-text-primary)]";

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-xl font-semibold text-[var(--ds-text-primary)]">Create project</h1>
      <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">
        Projects are stored under a portfolio. You can move or add more portfolios later from the app.
      </p>
      <form onSubmit={handleCreate} className="space-y-3">
        {portfolios.length > 1 ? (
          <div>
            <label htmlFor="create-project-portfolio" className="mb-1 block text-sm font-medium text-[var(--ds-text-secondary)]">
              Portfolio
            </label>
            <select
              id="create-project-portfolio"
              value={selectedPortfolioId}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className={selectClass}
              disabled={loading}
              required
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-[var(--ds-text-muted)]">
            Portfolio: <span className="font-medium text-[var(--ds-text-primary)]">{portfolios[0]?.name}</span>
          </p>
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[var(--ds-text-primary)]"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-[var(--ds-border)] bg-[var(--ds-text-primary)] px-4 py-2 text-sm font-medium text-[var(--ds-text-inverse)] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>
      {message && (
        <Callout
          status={message.type === "success" ? "success" : "danger"}
          role="alert"
          className="mt-3 text-[length:var(--ds-text-sm)]"
        >
          {message.text}
        </Callout>
      )}
      <p className="mt-6 text-sm text-[var(--ds-text-muted)]">
        <Link href="/" className="underline hover:no-underline">
          ← Back to dashboard
        </Link>
      </p>
    </main>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[30vh] max-w-md flex-col justify-center px-4 py-12">
          <LoadingPlaceholderCompact label="Loading" />
        </main>
      }
    >
      <CreateProjectForm />
    </Suspense>
  );
}
