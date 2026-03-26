"use client";

import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await supabaseBrowserClient().auth.signOut();
        window.location.href = "/";
      }}
      className="inline-flex px-4 py-2 text-sm font-medium rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
    >
      Sign out
    </button>
  );
}
