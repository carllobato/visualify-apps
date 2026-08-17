"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@visualify/design-system";

export function RestoreArchivedProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRestore() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: false }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not restore project.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onRestore()}>
        {busy ? "Restoring…" : "Restore"}
      </Button>
      {error ? (
        <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-status-danger-fg)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
