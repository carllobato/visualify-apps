"use client";

import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@visualify/design-system";

/** Matches HQ profile dropdown: POST `/auth/sign-out` so SSR cookies clear, then redirect to login. */
export function AccountSessionSignOutButton() {
  return (
    <Button
      variant="primary"
      onClick={async () => {
        try {
          const res = await fetch("/auth/sign-out", {
            method: "POST",
            credentials: "same-origin",
          });
          if (!res.ok) {
            await supabaseBrowserClient().auth.signOut({ scope: "global" });
          }
        } catch {
          await supabaseBrowserClient().auth.signOut({ scope: "global" });
        } finally {
          window.location.assign("/login");
        }
      }}
    >
      Sign out
    </Button>
  );
}
