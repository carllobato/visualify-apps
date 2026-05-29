"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Label, Input } from "@visualify/design-system";
import { CONTROLAI_ROUTES } from "@/lib/controlai-routes";
import type { MinimalResourceListItem } from "@/components/MinimalResourceList";

type CreateProjectFormProps = {
  portfolios: MinimalResourceListItem[];
  onCancel: () => void;
};

export function CreateProjectForm({ portfolios, onCancel }: CreateProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { name: trimmedName };
      if (portfolioId.trim()) {
        body.portfolioId = portfolioId.trim();
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
        project?: { id: string };
      };

      if (response.status === 400 && json.redirectTo === CONTROLAI_ROUTES.selectWorkspace) {
        router.push(CONTROLAI_ROUTES.selectWorkspace);
        return;
      }

      if (!response.ok || !json.project?.id) {
        setError(json.error ?? "Could not create project.");
        setLoading(false);
        return;
      }

      router.push(`/projects/${json.project.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-portfolio">
          Portfolio <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <select
          id="project-portfolio"
          value={portfolioId}
          onChange={(event) => setPortfolioId(event.target.value)}
          disabled={loading}
          className="h-10 w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
        >
          <option value="">No portfolio</option>
          {portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name.trim() || "Untitled"}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {error}
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create project"}
        </Button>
        <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
