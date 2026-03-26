"use client";

import { useRouter } from "next/navigation";
import { Button } from "@visualify/design-system";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export default function DevSignOutClient() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabaseBrowserClient().auth.signOut();
    router.refresh();
  };

  return (
    <Button
      type="button"
      onClick={handleSignOut}
      className="rounded border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-2 text-sm font-medium hover:bg-[var(--ds-surface-hover)]"
    >
      Sign Out
    </Button>
  );
}
