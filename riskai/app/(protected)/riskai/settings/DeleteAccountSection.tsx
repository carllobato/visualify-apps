"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Callout } from "@visualify/design-system";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 503 && data.code === "SERVICE_ROLE_MISSING") {
          setError(
            "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Project Settings → API → service_role secret), then restart the dev server. On Vercel, add the same variable under Project → Settings → Environment Variables and redeploy."
          );
        } else {
          setError(data.error ?? "Could not delete account.");
        }
        setDeleting(false);
        return;
      }
      await supabaseBrowserClient().auth.signOut();
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Try again.");
      setDeleting(false);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-medium text-[var(--ds-text-primary)]">Danger zone</h2>
      <div className="rounded-lg border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-subtle-bg)] p-4">
        <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
          Permanently delete your account and associated access. This does not remove data owned by
          organisations you were invited to unless your user record is the only link — confirm with
          your admin if unsure.
        </p>
        <p className="mb-3 text-xs leading-relaxed text-[var(--ds-text-muted)]">
          <span className="font-medium text-[var(--ds-text-secondary)]">Setup (self-hosted / local):</span> add{" "}
          <code className="rounded bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,transparent)] px-1 py-0.5 font-mono text-[11px]">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          to <code className="rounded bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,transparent)] px-1 py-0.5 font-mono text-[11px]">.env.local</code>{" "}
          (Supabase → Project Settings → API → <span className="whitespace-nowrap">service_role</span> secret), then
          restart the dev server. On Vercel, add the same variable under Project → Settings → Environment Variables and
          redeploy.
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="rounded-md border border-[var(--ds-status-danger-border)] bg-[var(--ds-surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)]"
        >
          Delete account
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          aria-describedby="delete-account-desc"
          onClick={() => !deleting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-account-title"
              className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
            >
              Delete account?
            </h3>
            <p id="delete-account-desc" className="mt-2 text-sm text-[var(--ds-text-secondary)]">
              Are you sure? This can&apos;t be undone. Your sign-in will be removed and you will lose
              access to this account immediately.
            </p>
            {error && (
              <Callout status="danger" role="alert" className="mt-3 text-[length:var(--ds-text-sm)] leading-relaxed">
                {error}
              </Callout>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--ds-border)] px-4 py-2.5 text-sm font-medium text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-lg bg-[var(--ds-status-danger-strong-bg)] px-4 py-2.5 text-sm font-medium text-[var(--ds-status-danger-strong-fg)] hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
