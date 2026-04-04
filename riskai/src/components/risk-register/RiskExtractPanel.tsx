"use client";

import { useState } from "react";
import { intelligentDraftToRisk } from "@/domain/risk/risk.mapper";
import { useRiskRegister } from "@/store/risk-register.store";
import { Callout } from "@visualify/design-system";

type Status = "idle" | "loading" | "error";

type RiskExtractPanelProps = {
  hideTitle?: boolean;
  showStatus?: boolean;
  /** When set, included in extract-risk API body for usage logging */
  projectId?: string | null;
};

export function RiskExtractPanel({
  hideTitle,
  showStatus = false,
  projectId,
}: RiskExtractPanelProps = {}) {
  const [documentText, setDocumentText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const { appendRisks } = useRiskRegister();

  async function handleExtract() {
    setErrorMessage(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/ai/extract-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText,
          ...(projectId != null && projectId.trim() !== "" ? { projectId: projectId.trim() } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Extract failed";
        setErrorMessage(msg);
        setStatus("error");
        return;
      }

      const draft = data?.risk;
      if (!draft) {
        setErrorMessage("Invalid response: missing risk");
        setStatus("error");
        return;
      }
      const risk = intelligentDraftToRisk(draft);
      appendRisks([risk]);
      setStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network or unexpected error";
      setErrorMessage(msg);
      setStatus("error");
    }
  }

  return (
    <div
      className={hideTitle ? "" : "rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] p-4 mb-4"}
      style={hideTitle ? undefined : { marginBottom: 16 }}
    >
      {!hideTitle && (
      <div className="flex flex-wrap items-center gap-2 mb-0">
        <h2 className="text-lg font-semibold text-[var(--ds-text-primary)]">
          Generate Risks from text entry
        </h2>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto px-2 py-1 text-xs rounded border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)] dark:hover:text-[var(--ds-text-secondary)] flex items-center gap-1"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Collapse
              <span className="inline-block w-3 h-3" aria-hidden>▲</span>
            </>
          ) : (
            <>
              Show details
              <span className="inline-block w-3 h-3" aria-hidden>▼</span>
            </>
          )}
        </button>
      </div>
      )}

      {expanded && (
        <div className="space-y-3 mt-3">
          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Describe your risk including any mitigation, cost and time data."
            rows={6}
            className="w-full box-border px-3 py-2.5 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] text-sm font-[inherit] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] focus:border-transparent"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExtract}
              disabled={status === "loading"}
              className="w-full px-3 py-1.5 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50 disabled:pointer-events-none"
            >
              Extract
            </button>
            {showStatus && (
              <span className="inline-flex flex-col gap-2">
                {status === "idle" && (
                  <span className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">Idle</span>
                )}
                {status === "loading" && (
                  <span className="inline-flex items-center gap-2" aria-busy="true">
                    <span className="inline-block h-3 w-20 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                    <span className="sr-only">Loading</span>
                  </span>
                )}
                {status === "error" && errorMessage && (
                  <Callout status="danger" role="alert" className="!m-0 max-w-md text-[length:var(--ds-text-sm)]">
                    {errorMessage}
                  </Callout>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
