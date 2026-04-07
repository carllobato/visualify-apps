"use client";

import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@visualify/design-system";

export function SignOutButton() {
  return (
    <Button
      variant="primary"
      onClick={async () => {
        await supabaseBrowserClient().auth.signOut();
        window.location.href = "/";
      }}
    >
      Sign out
    </Button>
  );
}
