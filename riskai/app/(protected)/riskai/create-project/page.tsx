"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { Button, Callout, HelperText, Input, Label } from "@visualify/design-system";
import { LoadingPlaceholder, LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";

const ACTIVE_PROJECT_KEY = "activeProjectId";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PortfolioRow = { id: string; name: string };

/** Matches {@link Input} / design-system field styling for native `<select>`. */
const SELECT_FIELD_CLASS =
  "w-full rounded-[var(--ds-radius-md)] border-2 border-[var(--ds-border)] bg-[var(--ds-surface-inset)] px-3 py-2 " +
  "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] transition-colors duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
  "enabled:hover:border-[var(--ds-control-border-hover)] enabled:hover:bg-[var(--ds-input-bg-hover)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-text-muted)]";

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
        if (cancelled) return;
        setPortfolios(list);
        const fromQuery =
          paramPortfolioId && UUID_REGEX.test(paramPortfolioId) ? paramPortfolioId : null;
        const validFromQuery = fromQuery && list.some((p) => p.id === fromQuery) ? fromQuery : null;
        // Default to no portfolio unless ?portfolioId= points at a valid row.
        setSelectedPortfolioId(validFromQuery ?? "");
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
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        name,
        ...(selectedPortfolioId.trim() ? { portfolioId: selectedPortfolioId.trim() } : {}),
      }),
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
      <div className="w-full px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-md">
          <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
            {loadError}
          </Callout>
          <Link
            href={DASHBOARD_PATH}
            className="mt-4 inline-block text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] underline underline-offset-2 hover:text-[var(--ds-text-primary)]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (portfolios === null) {
    return (
      <div className="w-full px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[30vh] max-w-md flex-col justify-center">
          <LoadingPlaceholder label="Loading portfolios" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-10 sm:px-6">
      <main className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-[var(--ds-text-primary)]">Create project</h1>
        <p className="mb-6 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          Linking a project to a portfolio is optional. You can assign or change it later from the app.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          {portfolios.length > 0 ? (
            <div>
              <Label htmlFor="create-project-portfolio" className="text-[var(--ds-text-secondary)]">
                Portfolio (optional)
              </Label>
              <select
                id="create-project-portfolio"
                value={selectedPortfolioId}
                onChange={(e) => setSelectedPortfolioId(e.target.value)}
                className={SELECT_FIELD_CLASS}
                disabled={loading}
              >
                <option value="">No portfolio</option>
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <HelperText className="!mt-0">
              No portfolios yet — this project will not be linked to one. You can create a portfolio from
              the dashboard and assign it later.
            </HelperText>
          )}
          <div>
            <Label htmlFor="create-project-name">Project name</Label>
            <Input
              id="create-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 risk review"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Creating…" : "Create project"}
          </Button>
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
        <p className="mt-8 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
          <Link
            href={DASHBOARD_PATH}
            className="text-[var(--ds-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--ds-text-primary)]"
          >
            ← Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4 py-10 sm:px-6">
          <div className="mx-auto flex min-h-[30vh] max-w-md flex-col justify-center">
            <LoadingPlaceholderCompact label="Loading" />
          </div>
        </div>
      }
    >
      <CreateProjectForm />
    </Suspense>
  );
}
