"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { OnboardingMetaKey } from "@/lib/onboarding/types";
import { Callout } from "@visualify/design-system";
import { OnboardingStepActions } from "./OnboardingStepActions";
import { riskaiPath } from "@/lib/routes";

type Props = {
  open: boolean;
  projectId: string | null;
  initialName: string;
  onComplete: () => void | Promise<void>;
  onBack: () => void;
};

export function ProjectOnboardingSetupModal({
  open,
  projectId,
  initialName,
  onComplete,
  onBack,
}: Props) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName, projectId]);

  if (!open || !projectId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save.");
        return;
      }
      const supabase = supabaseBrowserClient();
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { [OnboardingMetaKey.wizardComplete]: true },
      });
      if (metaErr) {
        setError(metaErr.message);
        return;
      }
      await onComplete();
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  }

  const busy = saving || signingOut;
  const inputClass =
    "w-full rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--ds-text-secondary)]";

  return (
    <div
      className="fixed inset-0 z-[104] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-project-setup-title"
    >
      <div className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
        <h2
          id="onboarding-project-setup-title"
          className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Set up your project
        </h2>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          Confirm the display name for this project. You can add budgets, schedule, and risk appetite
          later in{" "}
          <Link
            href={riskaiPath(`/projects/${projectId}/settings`)}
            className="font-medium text-[var(--ds-text-primary)] underline-offset-2 hover:underline"
          >
            project settings
          </Link>
          .
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onb-project-setup-name" className={labelClass}>
              Project name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-project-setup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
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
                className="w-full rounded-[var(--ds-radius-sm)] bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] sm:w-auto sm:min-w-[200px]"
              >
                {saving ? "Saving…" : "Go to dashboard"}
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
