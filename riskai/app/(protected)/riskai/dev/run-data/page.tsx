"use client";

import { useLayoutEffect, useState } from "react";
import RunDataPage from "../../run-data/page";

function readActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("activeProjectId");
    if (typeof raw === "string" && raw.trim().length > 0 && raw !== "undefined") {
      return raw.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Dev-only Run Data: same UI as production but without a `[projectId]` segment in the URL.
 * Resolves the active project from localStorage so snapshot persist uses a real project row.
 */
export default function DevRunDataPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  useLayoutEffect(() => {
    setProjectId(readActiveProjectId());
  }, []);
  return <RunDataPage projectId={projectId} />;
}
