"use client";

import type { ChangeEvent, MouseEvent, FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Callout, Label, Textarea } from "@visualify/design-system";
import {
  AppShellHelpFeedbackActionSelect,
  type AppShellHelpFeedbackAction,
} from "./AppShellHelpFeedbackActionSelect";
import "./app-shell-help-feedback-modal.css";

type HelpAction = AppShellHelpFeedbackAction;

const HELP_ACTION_OPTIONS: ReadonlyArray<{ value: HelpAction; label: string }> = [
  { value: "issue", label: "Report an issue" },
  { value: "feature", label: "Request a feature" },
  { value: "question", label: "Ask a question" },
];

export type AppShellHelpFeedbackUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type AppShellHelpFeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  /** Stored on `visualify_contact.source` (e.g. `riskai-help-modal`). */
  source: string;
  /** Resolve the signed-in user before submit. */
  getSignedInUser: () => Promise<AppShellHelpFeedbackUser | null>;
  contactApiPath?: string;
};

const MAX_NAME = 200;

function displayNameFromUser(user: AppShellHelpFeedbackUser): string {
  const meta = user.user_metadata;
  const full = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full.slice(0, MAX_NAME);
  const first = typeof meta?.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta?.last_name === "string" ? meta.last_name.trim() : "";
  const joined = [first, last].filter(Boolean).join(" ");
  if (joined) return joined.slice(0, MAX_NAME);
  const email = user.email?.trim() ?? "";
  const local = email.includes("@") ? email.split("@")[0] : email;
  return (local || "User").slice(0, MAX_NAME);
}

type HelpPageContext = {
  url: string;
  path: string;
};

function buildContactBody(action: HelpAction, pageContext: HelpPageContext, userMessage: string): string {
  return `Type: ${action}
URL: ${pageContext.url}
Path: ${pageContext.path}

${userMessage.trim()}`;
}

export function AppShellHelpFeedbackModal({
  open,
  onClose,
  source,
  getSignedInUser,
  contactApiPath = "/api/contact",
}: AppShellHelpFeedbackModalProps) {
  const titleId = useId();
  const fieldId = useId();
  const actionFieldId = useId();
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [action, setAction] = useState<HelpAction>("issue");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setFormError(null);
      setSubmitted(false);
      setAction("issue");
      setMessage("");
      return;
    }
    setSubmitted(false);
    setAction("issue");
    setMessage("");
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const bodyText = message.trim();
    if (!bodyText) {
      setFormError("Enter a message.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await getSignedInUser();
      const email = user?.email?.trim().toLowerCase();
      if (!email) {
        setFormError("You need to be signed in to send feedback.");
        return;
      }
      const name = user ? displayNameFromUser(user) : "";
      const pageContext: HelpPageContext = {
        url: window.location.href,
        path: window.location.pathname,
      };

      const res = await fetch(contactApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: buildContactBody(action, pageContext, bodyText),
          source,
          url: pageContext.url,
          path: pageContext.path,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setFormError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="ds-modal-backdrop z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
    >
      <div
        className="vf-app-shell-help-feedback-modal ds-modal-panel w-full max-w-md min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-panel-header">
          <h2 id={titleId} className="ds-modal-panel-title">
            {submitted ? "Message sent successfully" : "Help & Feedback"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ds-onboarding-modal-close"
            aria-label="Close"
          >
            <span aria-hidden className="ds-modal-panel-close-icon">
              ×
            </span>
          </button>
        </div>
        <div className="ds-modal-panel-body">
          {submitted ? (
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                We’ve received your message and will review it shortly.
              </p>
              <Button type="button" variant="primary" size="md" className="w-full sm:w-auto" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-md:gap-3">
              {formError ? (
                <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                  {formError}
                </Callout>
              ) : null}
              <div className="hidden flex-col md:flex">
                <Label className="mb-2 block text-[var(--ds-text-secondary)]">Feedback type</Label>
                <div className="ds-segmented-control" role="group" aria-label="Feedback type">
                  {HELP_ACTION_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={action === option.value ? "primary" : "ghost"}
                      size="sm"
                      className="ds-segmented-control__segment"
                      aria-pressed={action === option.value}
                      disabled={submitting}
                      onClick={() => setAction(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col md:hidden">
                <Label htmlFor={actionFieldId}>Feedback type</Label>
                <AppShellHelpFeedbackActionSelect
                  id={actionFieldId}
                  value={action}
                  options={HELP_ACTION_OPTIONS}
                  onChange={setAction}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor={fieldId} className="mb-1.5 block text-[var(--ds-text-secondary)]">
                  Message
                </Label>
                <Textarea
                  id={fieldId}
                  value={message}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  className="min-h-[88px] max-md:min-h-[9.5rem]"
                  placeholder="Tell us more…"
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
