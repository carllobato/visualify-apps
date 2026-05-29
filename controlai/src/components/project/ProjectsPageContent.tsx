"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@visualify/design-system";
import { MinimalResourceList, type MinimalResourceListItem } from "@/components/MinimalResourceList";
import { CreateProjectForm } from "@/components/project/CreateProjectForm";
import { CONTROLAI_ROUTES } from "@/lib/controlai-routes";

type ProjectsPageContentProps = {
  projects: MinimalResourceListItem[];
  portfolios: MinimalResourceListItem[];
  hasActiveWorkspace: boolean;
};

export function ProjectsPageContent({
  projects,
  portfolios,
  hasActiveWorkspace,
}: ProjectsPageContentProps) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
            Projects
          </h1>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            Projects in this workspace. Portfolios are optional grouping.
          </p>
        </div>
        {hasActiveWorkspace && !creating ? (
          <Button type="button" onClick={() => setCreating(true)}>
            New project
          </Button>
        ) : null}
      </div>

      {!hasActiveWorkspace ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          <Link
            href={CONTROLAI_ROUTES.selectWorkspace}
            className="text-[var(--ds-text-primary)] underline-offset-2 hover:underline"
          >
            Select a workspace
          </Link>{" "}
          before creating projects.
        </p>
      ) : null}

      {creating ? (
        <CreateProjectForm portfolios={portfolios} onCancel={() => setCreating(false)} />
      ) : null}

      {projects.length === 0 && !creating && hasActiveWorkspace ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          No projects in this workspace yet.{" "}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-[var(--ds-text-primary)] underline-offset-2 hover:underline"
          >
            Create your first project
          </button>
          .
        </p>
      ) : null}

      {projects.length === 0 && !creating && !hasActiveWorkspace ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          No projects in this workspace yet.
        </p>
      ) : null}

      {projects.length > 0 ? (
        <MinimalResourceList
          title=""
          description=""
          emptyMessage=""
          items={projects}
          itemHref={(id) => `/projects/${id}`}
          hideHeader
        />
      ) : null}
    </div>
  );
}
