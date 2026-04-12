"use client";

import { useEffect, useState } from "react";
import { projectSettingsSelectClass } from "@/components/project/projectSettingsDsFormClasses";
import type { ProjectMemberRole } from "@/types/projectMembers";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PROJECT_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

const INVITE_ROLES: { value: ProjectMemberRole; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

type Props = {
  open: boolean;
  projectId: string;
  onFinished: () => void | Promise<void>;
  onBack: () => void;
  onDismiss: () => void;
};

export function ProjectOnboardingInviteModal({
  open,
  projectId,
  onFinished,
  onBack,
  onDismiss,
}: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>("editor");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setFirstName("");
    setSurname("");
    setRole("editor");
    setError(null);
  }, [open, projectId]);

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
      const res = await fetch(`/api/projects/${projectId}/members/invite`, {
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
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
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
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[105]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-onboarding-invite-title"
    >
      <div className="ds-onboarding-modal-panel flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={6} of={PROJECT_ONBOARDING_STEP_TOTAL} />
            <h2 id="project-onboarding-invite-title" className="ds-onboarding-modal-title">
              Add project members
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
          Optional - invite one member now, or skip and add members later in project settings.
        </p>
        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          <div>
            <label htmlFor="project-onboarding-invite-email" className="ds-onboarding-modal-label">
              Email <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="project-onboarding-invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="email"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="project-onboarding-invite-first" className="ds-onboarding-modal-label">
              First name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="project-onboarding-invite-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="given-name"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="project-onboarding-invite-surname" className="ds-onboarding-modal-label">
              Surname <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="project-onboarding-invite-surname"
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="ds-onboarding-modal-input"
              autoComplete="family-name"
              disabled={sending}
            />
          </div>
          <div>
            <label htmlFor="project-onboarding-invite-role" className="ds-onboarding-modal-label">
              Role
            </label>
            <select
              id="project-onboarding-invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectMemberRole)}
              disabled={sending}
              className={projectSettingsSelectClass(false, "sm")}
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
              onClick={() => void handleSkip()}
              disabled={sending}
              className="text-sm font-medium text-[var(--ds-text-secondary)] underline-offset-2 hover:text-[var(--ds-text-primary)] hover:underline disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
