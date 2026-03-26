"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { OnboardingMetaKey } from "@/lib/onboarding/types";
import { Callout } from "@visualify/design-system";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  /** After “Back” from portfolio details — confirm before returning to the detail step. */
  postCreateBridge: { id: string; name: string } | null;
  onBackToProfile: () => void;
  onForwardFromPostCreateBridge: () => void;
  onCreated: (portfolio: { id: string; name: string }) => void | Promise<void>;
  /** Skip creates a default portfolio so projects can be added without the naming step. */
  onSkipped: (payload: { portfolioId: string }) => void | Promise<void>;
};

export function PortfolioSetupModal({
  open,
  postCreateBridge,
  onBackToProfile,
  onForwardFromPostCreateBridge,
  onCreated,
  onSkipped,
}: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a portfolio name.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
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

  async function handleSkip() {
    setError(null);
    setSkipping(true);
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My portfolio" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        portfolio?: { id: string };
      };
      if (!res.ok || !json.portfolio?.id) {
        setError(json.error ?? "Could not create a portfolio.");
        return;
      }
      const supabase = supabaseBrowserClient();
      const { error: err } = await supabase.auth.updateUser({
        data: { [OnboardingMetaKey.portfolioSkipped]: true },
      });
      if (err) {
        setError(err.message);
        return;
      }
      await onSkipped({ portfolioId: json.portfolio.id });
    } finally {
      setSkipping(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  }

  const busy = loading || skipping || signingOut;
  const inputClass =
    "w-full rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--ds-text-secondary)]";

  if (postCreateBridge) {
    return (
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-portfolio-bridge-title"
      >
        <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
          <h2
            id="onboarding-portfolio-bridge-title"
            className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
          >
            Portfolio created
          </h2>
          <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
            <span className="font-medium text-[var(--ds-text-primary)]">{postCreateBridge.name}</span> is
            ready. Continue to add a description, or go back to your profile.
          </p>
          <OnboardingStepActions
            onBack={onBackToProfile}
            busy={busy}
            forwardSlot={
              <button
                type="button"
                disabled={busy}
                onClick={() => void onForwardFromPostCreateBridge()}
                className="w-full rounded-lg bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] sm:w-auto sm:min-w-[200px]"
              >
                Continue to portfolio details
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
      className="fixed inset-0 z-[101] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
        <h2
          id="onboarding-portfolio-title"
          className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Name your portfolio
        </h2>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          Portfolios group your projects. Skip creates a default portfolio you can rename later.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onboarding-portfolio-name" className={labelClass}>
              Portfolio name
            </label>
            <input
              id="onboarding-portfolio-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Capital projects 2025"
              autoComplete="organization"
              disabled={busy}
            />
          </div>
          {error && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            onBack={onBackToProfile}
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
          <button
            type="button"
            disabled={busy}
            onClick={handleSkip}
            className="w-full rounded-lg border border-[var(--ds-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--ds-text-primary)] transition-opacity hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
          >
            {skipping ? "Skipping…" : "Skip for now"}
          </button>
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
