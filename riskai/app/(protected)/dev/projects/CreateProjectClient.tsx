"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Callout } from "@visualify/design-system";
import { LoadingPlaceholder } from "@/components/ds/LoadingPlaceholder";

type PortfolioRow = { id: string; name: string };

export default function CreateProjectClient() {
  const [name, setName] = useState("");
  const [portfolios, setPortfolios] = useState<PortfolioRow[] | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

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
        if (list.length === 0) {
          setLoadError("Create a portfolio first (from the dashboard or onboarding).");
          return;
        }
        setPortfolios(list);
        setSelectedPortfolioId(list[0]!.id);
      } catch {
        if (!cancelled) setLoadError("Could not load portfolios.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setMessage({ type: "success", text: "Project created." });
    setName("");
    setLoading(false);
    router.refresh();
  };

  const selectClass =
    "w-full max-w-xs rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm text-[var(--ds-text-primary)]";

  if (loadError) {
    return (
      <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
        {loadError}
      </Callout>
    );
  }

  if (portfolios === null) {
    return <LoadingPlaceholder label="Loading portfolios" />;
  }

  return (
    <form onSubmit={handleCreate} className="space-y-2">
      {portfolios.length > 1 ? (
        <div>
          <label htmlFor="dev-create-project-portfolio" className="mb-1 block text-xs font-medium text-[var(--ds-text-secondary)]">
            Portfolio
          </label>
          <select
            id="dev-create-project-portfolio"
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
        <p className="max-w-xs text-xs text-[var(--ds-text-muted)]">
          Portfolio: <span className="font-medium text-[var(--ds-text-primary)]">{portfolios[0]?.name}</span>
        </p>
      )}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
        className="w-full max-w-xs rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-[var(--ds-text-primary)]"
        required
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm font-medium hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create"}
      </button>
      {message && (
        <Callout
          status={message.type === "success" ? "success" : "danger"}
          role="alert"
          className="text-[length:var(--ds-text-sm)]"
        >
          {message.text}
        </Callout>
      )}
    </form>
  );
}
