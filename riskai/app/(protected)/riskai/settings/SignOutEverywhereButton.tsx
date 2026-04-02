"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@visualify/design-system";

export function SignOutEverywhereButton() {
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("pending");
    setError(null);

    try {
      const res = await fetch("/api/account/sign-out-everywhere", {
        method: "POST",
      });

      if (!res.ok) {
        setError("Failed to sign out everywhere. Please try again.");
        setStatus("error");
        return;
      }

      await supabaseBrowserClient().auth.signOut();
      window.location.href = "/login";
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        disabled={status === "pending"}
        onClick={handleClick}
      >
        {status === "pending" ? "Signing out…" : "Sign out everywhere"}
      </Button>
      {error && (
        <p className="text-xs text-[var(--ds-status-danger-fg)]">{error}</p>
      )}
    </div>
  );
}
