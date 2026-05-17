"use client";

import { useEffect } from "react";
import Link from "next/link";
import { riskaiPath } from "@/lib/routes";

const ACTIVE_PROJECT_KEY = "activeProjectId";

export default function AccessNotFoundPage() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <main className="min-h-[40vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">
          Project or portfolio not found
        </h1>
        <p className="text-sm text-[var(--ds-text-secondary)]">
          The item you requested does not exist or you do not have access to it.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href={riskaiPath("/projects")}
            className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)]"
          >
            Go to projects
          </Link>
          <Link
            href={riskaiPath("/portfolios")}
            className="px-4 py-2 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-subtle-bg)] text-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-bg)]"
          >
            Go to portfolios
          </Link>
        </div>
      </div>
    </main>
  );
}
