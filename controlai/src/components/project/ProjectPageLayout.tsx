import type { ReactNode } from "react";
import { formatProjectDisplayName } from "@/lib/project-display-name";
import type { AccessibleProject } from "@/lib/portfolios-server";

export type ProjectPageLayoutProps = {
  project: AccessibleProject;
  children: ReactNode;
};

/**
 * Shared project-page chrome: project title and neutral content slot.
 * Project-level navigation lives in the app shell rail; module sub-navigation belongs in `children`.
 */
export function ProjectPageLayout({ project, children }: ProjectPageLayoutProps) {
  const displayName = formatProjectDisplayName(project.name);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[var(--ds-border-subtle)] pb-2 pt-3">
        <h1 className="m-0 text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          {displayName}
        </h1>
      </header>

      <div className="min-h-0 min-w-0 flex-1 py-4">
        <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-col">{children}</div>
      </div>
    </div>
  );
}
