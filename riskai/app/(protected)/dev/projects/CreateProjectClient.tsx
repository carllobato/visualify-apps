"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Callout } from "@visualify/design-system";
import { LoadingPlaceholder } from "@/components/ds/LoadingPlaceholder";

type WorkspaceRow = { id: string; name: string; slug: string };

export default function CreateProjectClient() {
  const [name, setName] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[] | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspaces/creatable");
        const json = (await res.json()) as { workspaces?: WorkspaceRow[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadError(json.error ?? "Could not load workspaces.");
          return;
        }
        const list = json.workspaces ?? [];
        if (cancelled) return;
        if (list.length === 0) {
          setLoadError("You do not have permission to create a project in any RiskAI workspace.");
          return;
        }
        setWorkspaces(list);
        setSelectedWorkspaceId(list[0]!.id);
      } catch {
        if (!cancelled) setLoadError("Could not load workspaces.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selectedWorkspaceId) {
      setMessage({ type: "error", text: "Select a workspace." });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ name, workspaceId: selectedWorkspaceId }),
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

  if (workspaces === null) {
    return <LoadingPlaceholder label="Loading workspaces" />;
  }

  return (
    <form onSubmit={handleCreate} className="space-y-2">
      {workspaces.length > 1 ? (
        <div>
          <label htmlFor="dev-create-project-workspace" className="mb-1 block text-xs font-medium text-[var(--ds-text-secondary)]">
            Workspace
          </label>
          <select
            id="dev-create-project-workspace"
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className={selectClass}
            disabled={loading}
            required
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || w.slug || w.id}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="max-w-xs text-xs text-[var(--ds-text-muted)]">
          Workspace: <span className="font-medium text-[var(--ds-text-primary)]">{workspaces[0]?.name}</span>
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
