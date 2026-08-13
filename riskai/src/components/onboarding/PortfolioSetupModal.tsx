"use client";

import { useEffect, useRef, useState } from "react";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PORTFOLIO_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type CreatableWorkspace = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  /** When set (e.g. user went Back from reporting), PATCH name instead of POST create. */
  resumePortfolio: { id: string; name: string } | null;
  /**
   * Preferred workspace (e.g. from workspace invite). Intent only — must still be in the
   * creatable list; server authorises again on POST.
   */
  preferredWorkspaceId?: string | null;
  onCreated: (portfolio: { id: string; name: string }) => void | Promise<void>;
  onDismiss: () => void;
};

export function PortfolioSetupModal({
  open,
  resumePortfolio,
  preferredWorkspaceId = null,
  onCreated,
  onDismiss,
}: Props) {
  const [name, setName] = useState("");
  const [workspaces, setWorkspaces] = useState<CreatableWorkspace[] | null>(null);
  const [workspacesLoadError, setWorkspacesLoadError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevOpenRef = useRef(false);
  const prevResumeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    const resumeId = resumePortfolio?.id ?? null;
    if (!prevOpenRef.current || prevResumeIdRef.current !== resumeId) {
      setName(resumePortfolio?.name ?? "");
      setError(null);
      setWorkspacesLoadError(null);
      if (!resumePortfolio) {
        setWorkspaces(null);
        setSelectedWorkspaceId("");
      }
    }
    prevOpenRef.current = true;
    prevResumeIdRef.current = resumeId;
  }, [open, resumePortfolio]);

  useEffect(() => {
    if (!open || resumePortfolio) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspaces/creatable", {
          cache: "no-store",
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          workspaces?: CreatableWorkspace[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setWorkspaces([]);
          setWorkspacesLoadError(json.error?.trim() || "Could not load workspaces.");
          return;
        }
        const list = Array.isArray(json.workspaces) ? json.workspaces : [];
        setWorkspaces(list);
        setWorkspacesLoadError(null);

        const preferred =
          typeof preferredWorkspaceId === "string" && preferredWorkspaceId.trim()
            ? preferredWorkspaceId.trim()
            : "";
        if (list.length === 1) {
          setSelectedWorkspaceId(list[0]!.id);
        } else if (preferred && list.some((w) => w.id === preferred)) {
          setSelectedWorkspaceId(preferred);
        } else {
          setSelectedWorkspaceId("");
        }
      } catch {
        if (!cancelled) {
          setWorkspaces([]);
          setWorkspacesLoadError("Could not load workspaces.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, resumePortfolio, preferredWorkspaceId]);

  if (!open) return null;

  const creatableCount = workspaces?.length ?? null;
  const needsWorkspacePicker = creatableCount != null && creatableCount >= 2;
  const noCreatableWorkspaces = creatableCount === 0;
  const workspacesLoading = !resumePortfolio && workspaces === null && !workspacesLoadError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a portfolio name.");
      return;
    }

    if (!resumePortfolio) {
      if (workspacesLoadError) {
        setError(workspacesLoadError);
        return;
      }
      if (workspacesLoading || workspaces === null) {
        setError("Still loading workspaces. Try again in a moment.");
        return;
      }
      if (workspaces.length === 0) {
        setError(
          "You do not have permission to create a portfolio in any RiskAI workspace. Ask a workspace owner or admin for access.",
        );
        return;
      }
      if (workspaces.length >= 2 && !selectedWorkspaceId.trim()) {
        setError("Select a workspace for this portfolio.");
        return;
      }
    }

    setLoading(true);
    try {
      if (resumePortfolio) {
        const res = await fetch(`/api/portfolios/${resumePortfolio.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Could not update portfolio name.");
          setLoading(false);
          return;
        }
        setLoading(false);
        await onCreated({ id: resumePortfolio.id, name: trimmed });
        return;
      }

      const workspaceId =
        workspaces!.length === 1
          ? workspaces![0]!.id
          : selectedWorkspaceId.trim();

      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          ...(workspaceId ? { workspaceId } : {}),
        }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        portfolio?: { id: string; name: string };
      };
      if (!res.ok || !json.portfolio?.id) {
        setError(json.error ?? "Could not create portfolio.");
        setLoading(false);
        return;
      }
      setLoading(false);
      await onCreated({ id: json.portfolio.id, name: json.portfolio.name });
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  const busy = loading || workspacesLoading;
  const createBlocked = Boolean(noCreatableWorkspaces || workspacesLoadError);

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-title"
    >
      <div className="ds-onboarding-modal-panel">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={1} of={PORTFOLIO_ONBOARDING_STEP_TOTAL} />
            <h2 id="onboarding-portfolio-title" className="ds-onboarding-modal-title">
              Name your portfolio
            </h2>
          </div>
          <button
            type="button"
            className="ds-onboarding-modal-close"
            onClick={onDismiss}
            disabled={loading}
            aria-label="Close"
          >
            <OnboardingModalCloseIcon />
          </button>
        </div>
        <p className="ds-onboarding-modal-lede">
          Portfolios group your projects. You can add a description later in portfolio settings.
        </p>
        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          {!resumePortfolio && needsWorkspacePicker ? (
            <div>
              <label htmlFor="onboarding-portfolio-workspace" className="ds-onboarding-modal-label">
                Workspace
              </label>
              <select
                id="onboarding-portfolio-workspace"
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="ds-onboarding-modal-input"
                disabled={busy}
                required
              >
                <option value="">Select a workspace…</option>
                {(workspaces ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label htmlFor="onboarding-portfolio-name" className="ds-onboarding-modal-label">
              Portfolio name
            </label>
            <input
              id="onboarding-portfolio-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ds-onboarding-modal-input"
              placeholder="e.g. Company Name"
              autoComplete="organization"
              disabled={busy || createBlocked}
            />
          </div>
          {workspacesLoadError || noCreatableWorkspaces ? (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {workspacesLoadError ??
                "You do not have permission to create a portfolio in any RiskAI workspace. Ask a workspace owner or admin for access."}
            </Callout>
          ) : null}
          {error ? (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          ) : null}
          <OnboardingStepActions
            busy={busy}
            forwardSlot={
              <button type="submit" disabled={busy || createBlocked}>
                {loading
                  ? resumePortfolio
                    ? "Saving…"
                    : "Creating…"
                  : workspacesLoading
                    ? "Loading…"
                    : "Continue"}
              </button>
            }
          />
        </form>
      </div>
    </div>
  );
}
