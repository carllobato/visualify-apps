"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setVisualifyActiveWorkspaceIdAction } from "../../../../workspace-switcher-actions";

/**
 * Next.js only allows cookie writes from Server Actions or Route Handlers, not during RSC render.
 * Keeps the active-workspace cookie aligned with the URL when opening `/hq/workspaces/...` directly.
 */
export function ActiveWorkspaceCookieSync({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await setVisualifyActiveWorkspaceIdAction(workspaceId);
      if (!cancelled && result.ok) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, router]);

  return null;
}
