"use client";

import { Button } from "@visualify/design-system";
import type { AppShellSupabaseAuthClient } from "./account-security/types";

export type AppShellSignOutButtonProps = {
  redirectTo: string;
  signOutRoute?: string;
  getSupabaseClient?: () => AppShellSupabaseAuthClient;
  /** When sign-out route fails, call `signOut({ scope: "global" })` instead of default scope. */
  useGlobalScopeFallback?: boolean;
};

export function AppShellSignOutButton({
  redirectTo,
  signOutRoute = "/auth/sign-out",
  getSupabaseClient,
  useGlobalScopeFallback = false,
}: AppShellSignOutButtonProps) {
  return (
    <Button
      variant="primary"
      onClick={async () => {
        try {
          const res = await fetch(signOutRoute, {
            method: "POST",
            credentials: "same-origin",
          });
          if (!res.ok && getSupabaseClient) {
            const client = getSupabaseClient();
            if (useGlobalScopeFallback) {
              await client.auth.signOut({ scope: "global" });
            } else {
              await client.auth.signOut();
            }
          }
        } catch {
          if (getSupabaseClient) {
            const client = getSupabaseClient();
            if (useGlobalScopeFallback) {
              await client.auth.signOut({ scope: "global" });
            } else {
              await client.auth.signOut();
            }
          }
        } finally {
          window.location.assign(redirectTo);
        }
      }}
    >
      Sign out
    </Button>
  );
}
