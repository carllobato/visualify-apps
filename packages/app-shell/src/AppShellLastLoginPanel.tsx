"use client";

import type { ReactNode } from "react";

export type AppShellLastLoginPanelProps = {
  updatedAt: string | null;
  lastSeenAt: string | null;
  userAgent: string | null;
  children?: ReactNode;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Presentational session metadata for account settings (no auth logic). */
export function AppShellLastLoginPanel({
  updatedAt,
  lastSeenAt,
  userAgent,
  children,
}: AppShellLastLoginPanelProps) {
  const hasSession = updatedAt || lastSeenAt;

  return (
    <div className="text-sm">
      {hasSession ? (
        <dl className="space-y-2">
          {updatedAt ? (
            <div>
              <dt className="text-[var(--ds-text-muted)]">Session started</dt>
              <dd className="font-medium text-[var(--ds-text-primary)]">{formatDate(updatedAt)}</dd>
            </div>
          ) : null}
          {lastSeenAt ? (
            <div>
              <dt className="text-[var(--ds-text-muted)]">Last active</dt>
              <dd className="font-medium text-[var(--ds-text-primary)]">{formatDate(lastSeenAt)}</dd>
            </div>
          ) : null}
          {userAgent ? (
            <div>
              <dt className="text-[var(--ds-text-muted)]">Device / browser</dt>
              <dd className="break-all text-xs text-[var(--ds-text-primary)]">{userAgent}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-[var(--ds-text-muted)]">No recent login information available.</p>
      )}
      {children ? <div className="mt-3 flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}
