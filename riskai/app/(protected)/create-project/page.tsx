"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import {
  createProjectRequestFromForm,
  projectCreateSelectorVisibility,
  resolveProjectCreateFormParent,
} from "@/lib/project/resolveWorkspaceProjectCreateParent";
import { Button, Callout, Input, Label } from "@visualify/design-system";
import { LoadingPlaceholder, LoadingPlaceholderCompact } from "@/components/ds/LoadingPlaceholder";

const ACTIVE_PROJECT_KEY = "activeProjectId";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PortfolioRow = { id: string; name: string; workspace_id?: string | null };
type WorkspaceRow = { id: string; name: string; slug: string };

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
  const paramWorkspaceId = searchParams.get("workspaceId");

  const [name, setName] = useState("");
  const [portfolios, setPortfolios] = useState<PortfolioRow[] | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[] | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [portfoliosRes, workspacesRes] = await Promise.all([
          fetch("/api/portfolios"),
          fetch("/api/workspaces/creatable"),
        ]);
        const portfoliosJson = (await portfoliosRes.json().catch(() => ({}))) as {
          portfolios?: PortfolioRow[];
          error?: string;
        };
        const workspacesJson = (await workspacesRes.json().catch(() => ({}))) as {
          workspaces?: WorkspaceRow[];
          error?: string;
        };
        if (cancelled) return;

        if (!portfoliosRes.ok) {
          setLoadError(portfoliosJson.error ?? "Could not load portfolios.");
          return;
        }
        if (!workspacesRes.ok) {
          setLoadError(workspacesJson.error ?? "Could not load workspaces.");
          return;
        }

        const list = portfoliosJson.portfolios ?? [];
        const wsList = workspacesJson.workspaces ?? [];
        setPortfolios(list);
        setWorkspaces(wsList);

        const fromQueryPortfolio =
          paramPortfolioId && UUID_REGEX.test(paramPortfolioId) ? paramPortfolioId : null;
        const fromQueryWorkspace =
          paramWorkspaceId && UUID_REGEX.test(paramWorkspaceId) ? paramWorkspaceId : null;
        const parent = resolveProjectCreateFormParent({
          preferredWorkspaceId: fromQueryWorkspace,
          preferredPortfolioId: fromQueryPortfolio,
          workspaces: wsList,
          portfolios: list,
        });
        setSelectedWorkspaceId(parent.selectedWorkspaceId);
        setSelectedPortfolioId(parent.selectedPortfolioId);
      } catch {
        if (!cancelled) setLoadError("Could not load workspaces or portfolios.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paramPortfolioId, paramWorkspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const fromQueryPortfolio =
      paramPortfolioId && UUID_REGEX.test(paramPortfolioId) ? paramPortfolioId : null;
    const fromQueryWorkspace =
      paramWorkspaceId && UUID_REGEX.test(paramWorkspaceId) ? paramWorkspaceId : null;
    const formParent = resolveProjectCreateFormParent({
      preferredWorkspaceId: fromQueryWorkspace,
      preferredPortfolioId: fromQueryPortfolio,
      workspaces: workspaces ?? [],
      portfolios: portfolios ?? [],
    });
    if (formParent.preferredWorkspaceDenied) {
      setMessage({
        type: "error",
        text: "You do not have permission to create a project in this workspace.",
      });
      return;
    }

    const workspaceId =
      selectedWorkspaceId.trim() ||
      formParent.selectedWorkspaceId ||
      (!formParent.portfolioBound && workspaces?.length === 1 ? workspaces[0]!.id : "");
    if (!formParent.portfolioBound && !workspaceId) {
      setMessage({ type: "error", text: "Select a workspace." });
      return;
    }

    const portfolioId = formParent.portfolioBound
      ? formParent.selectedPortfolioId
      : selectedPortfolioId.trim();
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(
        createProjectRequestFromForm({
          name,
          resolvedWorkspaceId: workspaceId,
          resolvedPortfolioId: portfolioId,
          launchedWithWorkspaceId: Boolean(fromQueryWorkspace),
          portfolioBound: formParent.portfolioBound,
        }),
      ),
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
      setLoading(false);
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

  if (portfolios === null || workspaces === null) {
    return (
      <div className="w-full px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[30vh] max-w-md flex-col justify-center">
          <LoadingPlaceholder label="Loading" />
        </div>
      </div>
    );
  }

  const fromQueryPortfolio =
    paramPortfolioId && UUID_REGEX.test(paramPortfolioId) ? paramPortfolioId : null;
  const fromQueryWorkspace =
    paramWorkspaceId && UUID_REGEX.test(paramWorkspaceId) ? paramWorkspaceId : null;
  const formParent = resolveProjectCreateFormParent({
    preferredWorkspaceId: fromQueryWorkspace,
    preferredPortfolioId: fromQueryPortfolio,
    workspaces,
    portfolios,
  });

  if (!formParent.portfolioBound && (workspaces.length === 0 || formParent.preferredWorkspaceDenied)) {
    return (
      <div className="w-full px-4 py-10 sm:px-6">
        <main className="mx-auto max-w-md">
          <h1 className="mb-2 text-2xl font-medium tracking-tight text-[var(--ds-text-primary)]">
            Create project
          </h1>
          <p className="mb-6 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
            You do not have permission to create a project in any RiskAI workspace. Ask a workspace
            owner or admin for access.
          </p>
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

  const resolvedWorkspaceId = formParent.portfolioBound
    ? selectedWorkspaceId || formParent.selectedWorkspaceId
    : selectedWorkspaceId.trim() ||
      formParent.selectedWorkspaceId ||
      (workspaces.length === 1 ? workspaces[0]!.id : "");

  const portfoliosInWorkspace = resolvedWorkspaceId
    ? portfolios.filter(
        (p) =>
          typeof p.workspace_id === "string" && p.workspace_id.trim() === resolvedWorkspaceId,
      )
    : [];

  const { showWorkspaceSelector, showPortfolioSelector } = projectCreateSelectorVisibility({
    portfolioBound: formParent.portfolioBound,
    workspaceBound: formParent.workspaceBound,
    preferredWorkspaceDenied: formParent.preferredWorkspaceDenied,
    workspacesCount: workspaces.length,
    selectedWorkspaceId: resolvedWorkspaceId,
    portfoliosInSelectedWorkspaceCount: portfoliosInWorkspace.length,
  });

  const boundWorkspace = resolvedWorkspaceId
    ? workspaces.find((w) => w.id === resolvedWorkspaceId)
    : workspaces.length === 1
      ? workspaces[0]
      : undefined;
  const showBoundWorkspaceLabel =
    !showWorkspaceSelector && Boolean(boundWorkspace) && !formParent.portfolioBound;

  return (
    <div className="w-full px-4 py-10 sm:px-6">
      <main className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-[var(--ds-text-primary)]">
          Create project
        </h1>
        <p className="mb-6 text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-secondary)]">
          Projects belong to a workspace. Linking a portfolio is optional.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          {showWorkspaceSelector ? (
            <div>
              <Label htmlFor="create-project-workspace" className="text-[var(--ds-text-secondary)]">
                Workspace
              </Label>
              <select
                id="create-project-workspace"
                value={selectedWorkspaceId}
                onChange={(e) => {
                  setSelectedWorkspaceId(e.target.value);
                  setSelectedPortfolioId("");
                }}
                className={SELECT_FIELD_CLASS}
                disabled={loading}
                required
              >
                <option value="" disabled>
                  Select a workspace
                </option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.slug || w.id}
                  </option>
                ))}
              </select>
            </div>
          ) : showBoundWorkspaceLabel ? (
            <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              Workspace:{" "}
              <span className="font-medium text-[var(--ds-text-primary)]">
                {boundWorkspace?.name || boundWorkspace?.slug || boundWorkspace?.id}
              </span>
            </p>
          ) : null}
          {showPortfolioSelector ? (
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
                {portfoliosInWorkspace.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
          <Button
            type="submit"
            variant="primary"
            disabled={
              loading ||
              (!formParent.portfolioBound && !selectedWorkspaceId.trim() && !formParent.selectedWorkspaceId && workspaces.length !== 1)
            }
          >
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
