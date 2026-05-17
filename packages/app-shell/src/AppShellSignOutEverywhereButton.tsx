"use client";

import { useState } from "react";
import { Button } from "@visualify/design-system";
import type { AppShellSupabaseAuthClient } from "./account-security/types";

export type AppShellSignOutEverywhereButtonProps = {
  redirectTo: string;
  apiPath?: string;
  getSupabaseClient?: () => AppShellSupabaseAuthClient;
};

export function AppShellSignOutEverywhereButton({
  redirectTo,
  apiPath = "/api/account/sign-out-everywhere",
  getSupabaseClient,
}: AppShellSignOutEverywhereButtonProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("pending");
    setError(null);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
      });

      if (!res.ok) {
        setError("Failed to sign out everywhere. Please try again.");
        setStatus("error");
        return;
      }

      if (getSupabaseClient) {
        await getSupabaseClient().auth.signOut();
      }
      window.location.assign(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button variant="secondary" disabled={status === "pending"} onClick={() => void handleClick()}>
        {status === "pending" ? "Signing out…" : "Sign out everywhere"}
      </Button>
      {error ? <p className="text-xs text-[var(--ds-status-danger-fg)]">{error}</p> : null}
    </div>
  );
}
