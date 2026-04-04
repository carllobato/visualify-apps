import type { ReactNode } from "react";

/**
 * Top-of-page permission explainer for settings routes (view-only or partial access).
 */
export function SettingsPermissionNotice({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-sm text-[var(--ds-text-secondary)] mb-4 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]/40 px-3 py-2"
      role="status"
    >
      {children}
    </p>
  );
}
