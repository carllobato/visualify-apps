"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";
import { OnboardingStepActions } from "./OnboardingStepActions";

const ACTIVE_PROJECT_KEY = "activeProjectId";

type Props = {
  open: boolean;
  portfolioId: string | null;
  /** Re-open project setup without inserting again. */
  resumeProject: { id: string; name: string } | null;
  onCreated: (project: { id: string; name: string }) => void | Promise<void>;
  onBack: () => void;
};

export function AddProjectOnboardingModal({
  open,
  portfolioId,
  resumeProject,
  onCreated,
  onBack,
}: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !resumeProject) {
      setName("");
      setError(null);
    }
  }, [open, portfolioId, resumeProject]);

  if (!open || !portfolioId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a project name.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ name: trimmed, portfolioId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      project?: { id: string; name: string };
      error?: string;
    };
    if (!res.ok || !json.project) {
      setError(json.error?.trim() || (res.status === 401 ? "Not signed in." : "Could not create project."));
      setLoading(false);
      return;
    }
    const row = json.project;
    if (!row?.id) {
      setError("Project created but could not continue.");
      setLoading(false);
      return;
    }
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, row.id);
    } catch {
      // ignore
    }
    setLoading(false);
    await onCreated({ id: row.id, name: row.name });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  }

  const busy = loading || signingOut;
  const inputClass =
    "w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--ds-text-secondary)]";

  if (resumeProject) {
    return (
      <div
        className="fixed inset-0 z-[103] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-add-project-resume-title"
      >
        <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
          <h2
            id="onboarding-add-project-resume-title"
            className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
          >
            Continue project setup
          </h2>
          <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
            <span className="font-medium text-[var(--ds-text-primary)]">{resumeProject.name}</span> is
            created. Continue to finish setup, or go back to the previous step.
          </p>
          <OnboardingStepActions
            onBack={onBack}
            busy={busy}
            forwardSlot={
              <button
                type="button"
                disabled={busy}
                onClick={() => void onCreated({ id: resumeProject.id, name: resumeProject.name })}
                className="w-full rounded-lg bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] sm:w-auto sm:min-w-[200px]"
              >
                Continue to project setup
              </button>
            }
          />
          <div className="mt-5 border-t border-[var(--ds-border)] pt-4 text-center">
            <p className="mb-2 text-xs text-[var(--ds-text-muted)]">
              Don&apos;t want to continue right now?
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignOut}
              className="text-sm font-medium text-[var(--ds-text-secondary)] underline-offset-2 hover:text-[var(--ds-text-primary)] hover:underline disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[103] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-add-project-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
        <h2
          id="onboarding-add-project-title"
          className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Add your first project
        </h2>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          Projects hold risks, simulations, and outputs for a single initiative.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onb-project-name" className={labelClass}>
              Project name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. North corridor upgrade"
              autoComplete="off"
              disabled={busy}
              required
            />
          </div>
          {error && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            onBack={onBack}
            busy={busy}
            forwardSlot={
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] sm:w-auto sm:min-w-[200px]"
              >
                {loading ? "Creating…" : "Continue"}
              </button>
            }
          />
          <div className="border-t border-[var(--ds-border)] pt-4 text-center">
            <p className="mb-2 text-xs text-[var(--ds-text-muted)]">
              Don&apos;t want to continue right now?
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignOut}
              className="text-sm font-medium text-[var(--ds-text-secondary)] underline-offset-2 hover:text-[var(--ds-text-primary)] hover:underline disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
