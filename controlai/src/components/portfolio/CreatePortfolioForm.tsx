"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Label, Input, Textarea } from "@visualify/design-system";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

type CreatePortfolioFormProps = {
  workspaces: EntitledWorkspace[];
  onCancel: () => void;
};

export function CreatePortfolioForm({ workspaces, onCancel }: CreatePortfolioFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState(
    workspaces.length === 1 ? workspaces[0]!.id : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showWorkspaceSelect = workspaces.length > 1;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Portfolio name is required.");
      return;
    }

    if (showWorkspaceSelect && !workspaceId.trim()) {
      setError("Select a workspace.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { name: trimmedName };
      const trimmedDescription = description.trim();
      if (trimmedDescription) {
        body.description = trimmedDescription;
      }
      if (showWorkspaceSelect && workspaceId.trim()) {
        body.workspaceId = workspaceId.trim();
      }

      const response = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        portfolio?: { id: string };
      };

      if (!response.ok || !json.portfolio?.id) {
        setError(json.error ?? "Could not create portfolio.");
        setLoading(false);
        return;
      }

      router.push(`/portfolios/${json.portfolio.id}`);
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
        <Label htmlFor="portfolio-name">Name</Label>
        <Input
          id="portfolio-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Portfolio name"
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="portfolio-description">
          Description <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
        </Label>
        <Textarea
          id="portfolio-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Brief description"
          disabled={loading}
          rows={3}
        />
      </div>

      {showWorkspaceSelect ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="portfolio-workspace">Workspace</Label>
          <select
            id="portfolio-workspace"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            disabled={loading}
            className="h-10 w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]"
          >
            <option value="">Select a workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
          {error}
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create portfolio"}
        </Button>
        <Button type="button" variant="secondary" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
