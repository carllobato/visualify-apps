"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button, Callout, Label, Textarea } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type HelpAction = "issue" | "feature" | "question";

type HelpFeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

const MAX_NAME = 200;

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
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

function buildContactBody(action: HelpAction, pathname: string | null, userMessage: string): string {
  const ctx = pathname && pathname.trim() !== "" ? pathname.trim() : "unknown";
  return `Type: ${action}
Context: ${ctx}

${userMessage.trim()}`;
}

export function HelpFeedbackModal({ open, onClose }: HelpFeedbackModalProps) {
  const titleId = useId();
  const fieldId = useId();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [action, setAction] = useState<HelpAction | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setFormError(null);
      setSubmitted(false);
      setAction(null);
      setMessage("");
      return;
    }
    setSubmitted(false);
    setAction(null);
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!action) {
      setFormError("Choose a feedback type.");
      return;
    }
    const bodyText = message.trim();
    if (!bodyText) {
      setFormError("Enter a message.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabaseBrowserClient().auth.getUser();
      const email = user?.email?.trim().toLowerCase();
      if (!email) {
        setFormError("You need to be signed in to send feedback.");
        return;
      }
      const name = user ? displayNameFromUser(user) : "";

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: buildContactBody(action, pathname, bodyText),
          source: "riskai-help-modal",
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
      <div className="ds-modal-panel w-full max-w-md min-h-0" onClick={(e) => e.stopPropagation()}>
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {formError ? (
                <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                  {formError}
                </Callout>
              ) : null}
              <div
                className="ds-segmented-control flex w-full flex-col gap-2"
                role="group"
                aria-label="Feedback type"
              >
                <Button
                  type="button"
                  variant={action === "issue" ? "primary" : "ghost"}
                  size="sm"
                  className="ds-segmented-control__segment w-full justify-start font-normal"
                  aria-pressed={action === "issue"}
                  disabled={submitting}
                  onClick={() => setAction("issue")}
                >
                  Report an issue
                </Button>
                <Button
                  type="button"
                  variant={action === "feature" ? "primary" : "ghost"}
                  size="sm"
                  className="ds-segmented-control__segment w-full justify-start font-normal"
                  aria-pressed={action === "feature"}
                  disabled={submitting}
                  onClick={() => setAction("feature")}
                >
                  Request a feature
                </Button>
                <Button
                  type="button"
                  variant={action === "question" ? "primary" : "ghost"}
                  size="sm"
                  className="ds-segmented-control__segment w-full justify-start font-normal"
                  aria-pressed={action === "question"}
                  disabled={submitting}
                  onClick={() => setAction("question")}
                >
                  Ask a question
                </Button>
              </div>
              <div>
                <Label htmlFor={fieldId} className="mb-1.5 block text-[var(--ds-text-secondary)]">
                  Message
                </Label>
                <Textarea
                  id={fieldId}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[88px]"
                  placeholder="Tell us more…"
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Submit"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
