"use client";

import { useState } from "react";
import { AppLoginFramedShell } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

const SIGN_OUT_ROUTE = "/auth/sign-out";

const primaryButtonClass =
  "mt-1 w-full cursor-pointer rounded-[var(--ds-radius-sm)] border border-transparent bg-[var(--ds-text-primary)] px-4 py-3 text-sm font-semibold text-[var(--ds-text-inverse)] transition-[background-color,border-color] duration-200 ease-out hover:border-[var(--ds-control-strong-border-hover)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_88%,var(--ds-surface-default))] active:border-[var(--ds-control-strong-border-active)] active:bg-[color-mix(in_oklab,var(--ds-text-primary)_78%,var(--ds-surface-default))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 " +
  "dark:border-[var(--ds-border)]/50 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] dark:hover:border-[var(--ds-border)]/75 dark:hover:bg-[var(--ds-surface-hover)] dark:active:border-[var(--ds-border)]/85 dark:active:bg-[var(--ds-surface-muted)] dark:focus-visible:outline-[var(--ds-border)]";

/**
 * Legacy no-access UI. The `/no-access` route now redirects authenticated users
 * through Workspace resolution; this screen is retained only if a remaining
 * access-denial case is wired back up.
 */
export function NoAccessClient() {
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    try {
      const res = await fetch(SIGN_OUT_ROUTE, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        await supabaseBrowserClient().auth.signOut();
      }
      window.location.href = "/login";
    } finally {
      setPending(false);
    }
  };

  return (
    <AppLoginFramedShell brandHref="/" brandTitle="Visualify RiskAI" brandAriaLabel="Visualify RiskAI">
      <div className="w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ds-text-primary)]">No access</h1>
        <p className="text-sm leading-relaxed text-[var(--ds-text-secondary)]">
          This account does not currently have access to RiskAI.
        </p>
        <button type="button" disabled={pending} onClick={handleSignOut} className={primaryButtonClass}>
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </AppLoginFramedShell>
  );
}
