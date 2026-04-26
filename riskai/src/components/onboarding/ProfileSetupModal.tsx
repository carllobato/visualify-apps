"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_PROFILE_UPDATED_EVENT } from "@/lib/onboarding/types";
import { saveUserProfileThroughApi } from "@/lib/profiles/profileDb";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";
import { OnboardingStepLabel } from "./OnboardingStepLabel";
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
    setSigningOut(false);
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
    setError(null);
    setSigningOut(true);
    const { error: signOutError } = await supabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setSigningOut(false);
      setError(signOutError.message);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div
      className="ds-onboarding-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-profile-title"
    >
      <div className="ds-onboarding-modal-panel">
        <OnboardingStepLabel step={1} of={1} />
        <h2 id="onboarding-profile-title" className="ds-onboarding-modal-title">
          Welcome — set up your profile
        </h2>
        <p className="ds-onboarding-modal-lede">
          A few details so we can personalise your workspace.
        </p>
        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          <div>
            <label htmlFor="onb-first-name" className="ds-onboarding-modal-label">
              First name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="given-name"
              required
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="onb-last-name" className="ds-onboarding-modal-label">
              Surname <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="family-name"
              required
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="onb-company" className="ds-onboarding-modal-label">
              Company <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="organization"
              required
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="onb-role" className="ds-onboarding-modal-label">
              Role <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
            </label>
            <input
              id="onb-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="ds-onboarding-modal-input"
              placeholder="e.g. Risk manager"
              autoComplete="organization-title"
              disabled={saving}
            />
          </div>
          {error && (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            busy={saving || signingOut}
            forwardPrimaryClassName=""
            forwardSlot={
              <div className="flex flex-col items-center gap-3">
                <button type="submit" className="ds-onboarding-modal-primary" disabled={saving || signingOut}>
                  {saving ? "Saving…" : "Continue"}
                </button>
                <button
                  type="button"
                  className="ds-onboarding-modal-signout"
                  onClick={() => void handleSignOut()}
                  disabled={saving || signingOut}
                >
                  {signingOut ? "Signing out…" : "Not ready? Sign out"}
                </button>
              </div>
            }
          />
        </form>
      </div>
    </div>
  );
}
