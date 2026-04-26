"use client";

import { useEffect, useState } from "react";
import type { PortfolioMemberRole } from "@/types/portfolioMembers";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PORTFOLIO_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

const INVITE_ROLES: { value: PortfolioMemberRole; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

type Props = {
  open: boolean;
  portfolioId: string;
  onFinished: () => void | Promise<void>;
  onBack: () => void;
  onDismiss: () => void;
};

export function PortfolioOnboardingInviteModal({
  open,
  portfolioId,
  onFinished,
  onBack,
  onDismiss,
}: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [role, setRole] = useState<PortfolioMemberRole>("editor");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setFirstName("");
    setSurname("");
    setRole("editor");
    setError(null);
  }, [open, portfolioId]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const em = email.trim();
    const fn = firstName.trim();
    const sn = surname.trim();
    if (!em) {
      setError("Email is required.");
      return;
    }
    if (!fn || !sn) {
      setError("First name and surname are required to send an invitation.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: em,
          first_name: fn,
          surname: sn,
          role,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        already_member?: boolean;
        invitation_sent?: boolean;
        error?: string;
        message?: string;
      };
      if (json.ok === true && json.already_member === true) {
        await onFinished();
        return;
      }
      if (json.ok === true && json.invitation_sent === true) {
        await onFinished();
        return;
      }
      if (!res.ok) {
        setError(
          json.message?.trim() ||
            json.error?.trim() ||
            (res.status === 503
              ? "Invitations are not configured on this environment."
              : "Could not send the invitation."),
        );
        return;
      }
      await onFinished();
    } finally {
      setSending(false);
    }
  }

  async function handleSkip() {
    setError(null);
    await onFinished();
  }

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[103]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-invite-title"
    >
      <div className="ds-onboarding-modal-panel">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={3} of={PORTFOLIO_ONBOARDING_STEP_TOTAL} />
            <h2 id="onboarding-portfolio-invite-title" className="ds-onboarding-modal-title">
              Invite a teammate
            </h2>
          </div>
          <button
            type="button"
            className="ds-onboarding-modal-close"
            onClick={onDismiss}
            disabled={sending}
            aria-label="Close"
          >
            <OnboardingModalCloseIcon />
          </button>
        </div>
        <p className="ds-onboarding-modal-lede">
          Optional — send one invitation now, or skip and add people later in portfolio settings.
        </p>

        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          <div>
            <label htmlFor="onb-portfolio-invite-email" className="ds-onboarding-modal-label">
              Email <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-portfolio-invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="email"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="onb-portfolio-invite-first" className="ds-onboarding-modal-label">
              First name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-portfolio-invite-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="given-name"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="onb-portfolio-invite-surname" className="ds-onboarding-modal-label">
              Surname <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="onb-portfolio-invite-surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="family-name"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="onb-portfolio-invite-role" className="ds-onboarding-modal-label">
              Role
            </label>
            <select
              id="onb-portfolio-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as PortfolioMemberRole)}
              disabled={sending}
              className="ds-onboarding-modal-select"
            >
              {INVITE_ROLES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            onBack={onBack}
            busy={sending}
            forwardSlot={
              <button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send invitation"}
              </button>
            }
          />
          <div className="text-center">
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleSkip()}
              className="text-sm font-medium text-[var(--ds-text-secondary)] underline-offset-2 hover:text-[var(--ds-text-primary)] hover:underline disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
