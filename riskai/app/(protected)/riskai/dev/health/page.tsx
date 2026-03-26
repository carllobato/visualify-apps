"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { runAllChecks, type CheckStatus, type CheckGroup } from "@/dev/healthChecks";
import { buildIntrospectionPayload } from "@/dev/engineIntrospection";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { Callout } from "@visualify/design-system";

type CheckResultRow = {
  group: CheckGroup;
  name: string;
  status: CheckStatus;
  message: string;
  details?: unknown;
};

const GROUPS: CheckGroup[] = [
  "Baseline Math",
  "Mitigation Logic",
  "Time Weighting",
  "Exposure Engine",
  "UI Gating",
  "Baseline Lock (Governance Integrity)",
];

const isDev = process.env.NODE_ENV === "development";
const PERF_WARN_MS = 100;

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass")
    return <span className="text-[var(--ds-status-success-strong-fg)]" aria-hidden>✅</span>;
  if (status === "warn")
    return <span className="text-[var(--ds-status-warning-strong-fg)]" aria-hidden>⚠️</span>;
  return <span className="text-[var(--ds-status-danger-strong-fg)]" aria-hidden>❌</span>;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-[var(--ds-border)] px-2 py-1 text-xs hover:bg-[var(--ds-surface-hover)]"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export type DevHealthPageProps = {
  projectId?: string | null;
};

export default function DevHealthPage({ projectId }: DevHealthPageProps = {}) {
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const [runResult, setRunResult] = useState<{ results: CheckResultRow[]; durationMs: number } | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [introspectionPayload, setIntrospectionPayload] = useState<unknown>(null);

  const runChecks = useCallback(() => {
    if (!isDev) return;
    const out = runAllChecks();
    setRunResult({ results: out.results as CheckResultRow[], durationMs: out.durationMs });
    try {
      setIntrospectionPayload(buildIntrospectionPayload());
    } catch {
      setIntrospectionPayload(null);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (!projectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Engine Health", end: null });
    return () => setPageHeaderExtras(null);
  }, [projectId, setPageHeaderExtras]);

  if (!isDev) {
    return (
      <main className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold m-0 mb-4">Engine Health</h1>
        <p className="text-[var(--ds-text-secondary)]">Dev tools disabled.</p>
      </main>
    );
  }

  const results = runResult?.results ?? [];
  const durationMs = runResult?.durationMs ?? 0;
  const effectiveStatus = (row: CheckResultRow): CheckStatus =>
    strictMode && row.status === "warn" ? "fail" : row.status;
  const passCount = results.filter((r) => effectiveStatus(r) === "pass").length;
  const warnCount = results.filter((r) => r.status === "warn" && !strictMode).length;
  const failCount = results.filter((r) => effectiveStatus(r) === "fail").length;

  const worstStatus: CheckStatus = results.length
    ? results.reduce<CheckStatus>((worst, r) => {
        const s = effectiveStatus(r);
        if (s === "fail") return "fail";
        if (s === "warn" && worst !== "fail") return "warn";
        return worst;
      }, "pass")
    : "pass";

  const bannerCalloutStatus =
    worstStatus === "fail" ? "danger" : worstStatus === "warn" ? "warning" : "success";

  const debugBundle = JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      durationMs,
      results,
      introspection: introspectionPayload,
    },
    null,
    2
  );

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <main className="p-6 w-full">
      {results.length > 0 && (
        <>
          <Callout status={bannerCalloutStatus} className="mb-4 text-[length:var(--ds-text-sm)]">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong>Overall: </strong>
                {worstStatus === "fail" ? "FAIL" : worstStatus === "warn" ? "WARN" : "PASS"}
                {strictMode && " (strict: warnings = failures)"}
              </span>
              <span>
                ✅ {passCount} passed · ⚠️ {warnCount} warned · ❌ {failCount} failed
              </span>
            </div>
          </Callout>
          <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">
            Deterministic validation harness: baseline math, mitigation, time weighting, exposure engine, UI gating, and baseline lock.
          </p>

          {durationMs > PERF_WARN_MS && (
            <Callout status="warning" className="mb-4 text-[length:var(--ds-text-sm)]">
              Performance: all checks took {durationMs.toFixed(0)}ms (threshold {PERF_WARN_MS}ms).
            </Callout>
          )}

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
                className="rounded border-[var(--ds-border)]"
              />
              Strict mode (warnings count as failures)
            </label>
            <button
              type="button"
              onClick={runChecks}
              className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--ds-surface-hover)]"
            >
              Re-run checks
            </button>
            <CopyButton text={debugBundle} label="Copy debug bundle" />
          </div>

          {GROUPS.map((group) => {
            const groupRows = results.filter((r) => r.group === group);
            if (groupRows.length === 0) return null;
            return (
              <div key={group} className="mb-8">
                <h2 className="mb-2 border-b border-[var(--ds-border)] pb-1 text-base font-semibold text-[var(--ds-text-primary)]">
                  {group}
                </h2>
                <div className="overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-inset)]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)]">
                        <th className="w-10 px-3 py-2 text-left font-medium text-[var(--ds-text-secondary)]">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ds-text-secondary)]">Check</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ds-text-secondary)]">Message</th>
                        <th className="w-28 px-3 py-2 text-left font-medium text-[var(--ds-text-secondary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRows.map((row) => {
                        const key = `${row.group}:${row.name}`;
                        const effective = effectiveStatus(row);
                        const hasDetails = row.details !== undefined && row.details !== null;
                        const isExpanded = expanded.has(key);
                        return (
                          <Fragment key={key}>
                            <tr className="border-b border-[var(--ds-border-subtle)] hover:bg-[color-mix(in_oklab,var(--ds-surface-hover)_55%,transparent)]">
                              <td className="py-2 px-3">
                                <StatusIcon status={effective} />
                              </td>
                              <td className="px-3 py-2 font-medium text-[var(--ds-text-primary)]">{row.name}</td>
                              <td className="px-3 py-2 text-[var(--ds-text-secondary)]">{row.message}</td>
                              <td className="flex items-center gap-2 px-3 py-2">
                                {hasDetails && (
                                  <>
                                    <CopyButton text={JSON.stringify(row.details, null, 2)} label="Copy details" />
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(key)}
                                      className="rounded border border-[var(--ds-border)] px-2 py-1 text-xs hover:bg-[var(--ds-surface-hover)]"
                                    >
                                      {isExpanded ? "Hide" : "Show"} details
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                            {hasDetails && isExpanded && (
                              <tr className="border-b border-[var(--ds-border-subtle)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_42%,transparent)]">
                                <td colSpan={4} className="p-0">
                                  <pre className="p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words m-0">
                                    {JSON.stringify(row.details, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {introspectionPayload != null && (
            <div className="mb-8">
              <h2 className="mb-2 border-b border-[var(--ds-border)] pb-1 text-base font-semibold text-[var(--ds-text-primary)]">
                Introspection payload
              </h2>
              <div className="overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-inset)]">
                <div className="flex items-center justify-between border-b border-[var(--ds-border)] px-3 py-2">
                  <span className="text-sm text-[var(--ds-text-secondary)]">Scenario multipliers, raw vs adjusted params, time weights, mitigation by month</span>
                  <CopyButton text={JSON.stringify(introspectionPayload, null, 2)} label="Copy" />
                </div>
                {expanded.has("introspection") ? (
                  <>
                    <pre className="p-3 text-xs overflow-x-auto whitespace-pre-wrap break-words m-0">
                      {JSON.stringify(introspectionPayload, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => toggleExpand("introspection")}
                      className="w-full px-3 py-2 text-left text-xs text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
                    >
                      Hide introspection
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleExpand("introspection")}
                    className="w-full px-3 py-2 text-left text-xs text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-hover)]"
                  >
                    Show introspection JSON
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isDev && runResult === null && (
        <p className="text-[var(--ds-text-muted)]">Running checks…</p>
      )}
    </main>
  );
}
