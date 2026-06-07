"use client";

import { useEffect, useState } from "react";
import { readReportLastProjectIdForWorkspace } from "@/lib/projects/report-last-project-preference";

/**
 * Reads last-used project preference after mount so SSR and hydration agree (both null).
 */
export function useReportLastProjectIdForWorkspace(
  workspaceId: string | null,
  refreshKey?: string,
): string | null {
  const [lastUsedProjectId, setLastUsedProjectId] = useState<string | null>(null);

  useEffect(() => {
    setLastUsedProjectId(readReportLastProjectIdForWorkspace(workspaceId));
  }, [workspaceId, refreshKey]);

  return lastUsedProjectId;
}
