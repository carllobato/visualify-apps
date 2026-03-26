"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  portfolioId: string;
  initialName: string;
  onContinue: () => void | Promise<void>;
  onBack: () => void;
};

export function PortfolioOnboardingDetailModal({
  open,
  portfolioId,
  initialName,
  onContinue,
  onBack,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription("");
    setError(null);
  }, [open, initialName, portfolioId]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Portfolio name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || null,
        }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save.");
        return;
      }
      await onContinue();
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
    "w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--ds-text-secondary)]";

  return (
    <div
      className="fixed inset-0 z-[102] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-detail-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
        <h2
          id="onboarding-portfolio-detail-title"
          className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Set up your portfolio
        </h2>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          You can change this anytime in portfolio settings.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onb-portfolio-detail-name" className={labelClass}>
              Name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-portfolio-detail-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="organization"
              disabled={busy}
              required
            />
          </div>
          <div>
            <label htmlFor="onb-portfolio-detail-desc" className={labelClass}>
              Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
            </label>
            <textarea
              id="onb-portfolio-detail-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[88px] resize-y`}
              placeholder="What this portfolio is for"
              disabled={busy}
              rows={3}
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
                {saving ? "Saving…" : "Continue"}
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
