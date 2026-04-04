"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_PROFILE_UPDATED_EVENT } from "@/lib/onboarding/types";
import { saveUserProfileThroughApi } from "@/lib/profiles/profileDb";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  initialCompany?: string;
  initialRole?: string;
  onComplete: () => void | Promise<void>;
};

export function ProfileSetupModal({
  open,
  initialFirstName = "",
  initialLastName = "",
  initialCompany = "",
  initialRole = "",
  onComplete,
}: Props) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(initialFirstName ?? "");
    setLastName(initialLastName ?? "");
    setCompany(initialCompany ?? "");
    setRole(initialRole ?? "");
    setError(null);
  }, [open, initialFirstName, initialLastName, initialCompany, initialRole]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const co = company.trim();
    if (!fn) {
      setError("First name is required.");
      return;
    }
    if (!ln) {
      setError("Surname is required.");
      return;
    }
    if (!co) {
      setError("Company is required.");
      return;
    }
    setSaving(true);
    const { error: errMsg } = await saveUserProfileThroughApi({
      first_name: fn,
      last_name: ln,
      company: co,
      role: role.trim() || null,
    });
    if (errMsg) {
      setSaving(false);
      setError(errMsg);
      return;
    }
    window.dispatchEvent(new CustomEvent(ACCOUNT_PROFILE_UPDATED_EVENT));
    try {
      await Promise.resolve(onComplete());
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  }

  const inputClass =
    "w-full rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2.5 text-sm text-[var(--ds-text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--ds-text-secondary)]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-profile-title"
    >
      <div className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]">
        <h2
          id="onboarding-profile-title"
          className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
        >
          Welcome — set up your profile
        </h2>
        <p className="mt-1 text-sm text-[var(--ds-text-secondary)]">
          A few details so we can personalise your workspace.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onb-first-name" className={labelClass}>
              First name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
              autoComplete="given-name"
              required
              disabled={saving || signingOut}
            />
          </div>
          <div>
            <label htmlFor="onb-last-name" className={labelClass}>
              Surname <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
              autoComplete="family-name"
              required
              disabled={saving || signingOut}
            />
          </div>
          <div>
            <label htmlFor="onb-company" className={labelClass}>
              Company <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
              autoComplete="organization"
              required
              disabled={saving || signingOut}
            />
          </div>
          <div>
            <label htmlFor="onb-role" className={labelClass}>
              Role <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
            </label>
            <input
              id="onb-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
              placeholder="e.g. Risk manager"
              autoComplete="organization-title"
              disabled={saving || signingOut}
            />
          </div>
          {error && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            busy={saving || signingOut}
            forwardSlot={
              <button
                type="submit"
                disabled={saving || signingOut}
                className="w-full rounded-[var(--ds-radius-sm)] bg-[var(--ds-text-primary)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-inverse)] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)]"
              >
                {saving ? "Saving…" : "Continue"}
              </button>
            }
          />
          <div className="mt-5 border-t border-[var(--ds-border)] pt-4 text-center">
            <p className="mb-2 text-xs text-[var(--ds-text-muted)]">
              Don&apos;t want to continue right now?
            </p>
            <button
              type="button"
              disabled={saving || signingOut}
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
