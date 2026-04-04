"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, Callout, Card, CardBody, CardHeader } from "@visualify/design-system";

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
    <>
      <Card>
        <CardHeader className="!px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-status-danger-fg)]">Danger zone</h2>
        </CardHeader>
        <CardBody className="!px-4 !py-3">
          <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
            Permanently delete your account and associated access. This does not remove data owned by
            organisations you were invited to unless your user record is the only link — confirm with
            your admin if unsure.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            className="border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:border-[var(--ds-status-danger-border)] hover:bg-[var(--ds-status-danger-bg)]"
          >
            Delete account
          </Button>
        </CardBody>
      </Card>

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
            className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]"
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
              <Button
                variant="secondary"
                disabled={deleting}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={deleting}
                onClick={confirmDelete}
                className="bg-[var(--ds-status-danger-strong-bg)] text-[var(--ds-status-danger-strong-fg)] shadow-none hover:bg-[var(--ds-status-danger-strong-bg)] hover:opacity-90"
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
