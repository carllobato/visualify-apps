"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Button, Callout } from "@visualify/design-system";
import {
  AccountSettingsCard,
  AccountSettingsCardContent,
  AccountSettingsCardHeader,
  accountSettingsIntroTextClassName,
} from "./account-settings";
import type { AppShellSupabaseAuthClient } from "./account-security/types";

const DEFAULT_SERVICE_ROLE_MISSING_MESSAGE =
  "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Project Settings → API → service_role secret), then restart the dev server. On Vercel, add the same variable under Project → Settings → Environment Variables and redeploy.";

const DEFAULT_INTRO =
  "Permanently delete your account and associated access. This does not remove data owned by organisations you were invited to unless your user record is the only link — confirm with your admin if unsure.";

export type AppShellDeleteAccountSectionProps = {
  redirectAfterDelete: string;
  getSupabaseClient: () => AppShellSupabaseAuthClient;
  deleteApiPath?: string;
  /** Shown when DELETE returns 503 with code SERVICE_ROLE_MISSING */
  serviceRoleMissingMessage?: string;
  /** Fallback when DELETE returns 403 without a server error body */
  authDisabledMessage?: string;
  introText?: ReactNode;
  idPrefix?: string;
};

export function AppShellDeleteAccountSection({
  redirectAfterDelete,
  getSupabaseClient,
  deleteApiPath = "/api/account",
  serviceRoleMissingMessage = DEFAULT_SERVICE_ROLE_MISSING_MESSAGE,
  authDisabledMessage,
  introText = DEFAULT_INTRO,
  idPrefix: idPrefixProp,
}: AppShellDeleteAccountSectionProps) {
  const reactId = useId().replace(/:/g, "");
  const idPrefix = idPrefixProp ?? `account-delete-${reactId}`;
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(deleteApiPath, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 503 && data.code === "SERVICE_ROLE_MISSING") {
          setError(serviceRoleMissingMessage);
        } else if (res.status === 403 && authDisabledMessage && !data.error?.trim()) {
          setError(authDisabledMessage);
        } else {
          setError(data.error ?? "Could not delete account.");
        }
        setDeleting(false);
        return;
      }
      await getSupabaseClient().auth.signOut();
      window.location.href = redirectAfterDelete;
    } catch {
      setError("Something went wrong. Try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Danger Zone" danger />
        <AccountSettingsCardContent>
          <p className={accountSettingsIntroTextClassName}>{introText}</p>
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
        </AccountSettingsCardContent>
      </AccountSettingsCard>

      {open ? (
        <div
          className="ds-modal-backdrop z-[120]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={() => !deleting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={titleId}
              className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
            >
              Delete account?
            </h3>
            <p id={descId} className="mt-2 text-sm text-[var(--ds-text-secondary)]">
              Are you sure? This can&apos;t be undone. Your sign-in will be removed and you will lose
              access to this account immediately.
            </p>
            {error ? (
              <Callout status="danger" role="alert" className="mt-3 text-[length:var(--ds-text-sm)] leading-relaxed">
                {error}
              </Callout>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button variant="secondary" disabled={deleting} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={deleting}
                onClick={() => void confirmDelete()}
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
