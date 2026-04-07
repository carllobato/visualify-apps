"use client";

import { useEffect, useRef, useState } from "react";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PORTFOLIO_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  /** When set (e.g. user went Back from reporting), PATCH name instead of POST create. */
  resumePortfolio: { id: string; name: string } | null;
  onCreated: (portfolio: { id: string; name: string }) => void | Promise<void>;
  onDismiss: () => void;
};

export function PortfolioSetupModal({
  open,
  resumePortfolio,
  onCreated,
  onDismiss,
}: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevOpenRef = useRef(false);
  const prevResumeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    const resumeId = resumePortfolio?.id ?? null;
    if (!prevOpenRef.current || prevResumeIdRef.current !== resumeId) {
      setName(resumePortfolio?.name ?? "");
      setError(null);
    }
    prevOpenRef.current = true;
    prevResumeIdRef.current = resumeId;
  }, [open, resumePortfolio]);

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
      if (resumePortfolio) {
        const res = await fetch(`/api/portfolios/${resumePortfolio.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Could not update portfolio name.");
          setLoading(false);
          return;
        }
        setLoading(false);
        await onCreated({ id: resumePortfolio.id, name: trimmed });
        return;
      }

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

  const busy = loading;

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-title"
    >
      <div className="ds-onboarding-modal-panel">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={1} of={PORTFOLIO_ONBOARDING_STEP_TOTAL} />
            <h2 id="onboarding-portfolio-title" className="ds-onboarding-modal-title">
              Name your portfolio
            </h2>
          </div>
          <button
            type="button"
            className="ds-onboarding-modal-close"
            onClick={onDismiss}
            disabled={busy}
            aria-label="Close"
          >
            <OnboardingModalCloseIcon />
          </button>
        </div>
        <p className="ds-onboarding-modal-lede">
          Portfolios group your projects. You can add a description later in portfolio settings.
        </p>
        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          <div>
            <label htmlFor="onboarding-portfolio-name" className="ds-onboarding-modal-label">
              Portfolio name
            </label>
            <input
              id="onboarding-portfolio-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ds-onboarding-modal-input"
              placeholder="e.g. Company Name"
              autoComplete="organization"
              disabled={busy}
            />
          </div>
          {error ? (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          ) : null}
          <OnboardingStepActions
            busy={busy}
            forwardSlot={
              <button type="submit" disabled={busy}>
                {loading ? (resumePortfolio ? "Saving…" : "Creating…") : "Continue"}
              </button>
            }
          />
        </form>
      </div>
    </div>
  );
}
