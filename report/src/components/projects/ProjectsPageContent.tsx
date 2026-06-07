"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@visualify/design-system";
import { CreateReportProjectForm } from "@/components/projects/CreateReportProjectForm";
import "@/components/layout/report-mobile-pages.css";
import { useReportLastProjectIdForWorkspace } from "@/lib/projects/useReportLastProjectIdForWorkspace";
import { reportProjectReportPath, REPORT_ROUTES } from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

type ProjectsPageContentProps = {
  projects: ReportProjectListItem[];
  hasActiveWorkspace: boolean;
  workspaceId: string | null;
};

export function ProjectsPageContent({
  projects,
  hasActiveWorkspace,
  workspaceId,
}: ProjectsPageContentProps) {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
  const lastUsedProjectId = useReportLastProjectIdForWorkspace(workspaceId, pathname);

  return (
    <main className="report-mobile-page mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
            Projects
          </h1>
          <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            Projects in this workspace.
          </p>
        </div>
        {hasActiveWorkspace && !creating ? (
          <Button type="button" className="max-md:hidden" onClick={() => setCreating(true)}>
            New project
          </Button>
        ) : null}
      </div>

      {!hasActiveWorkspace ? (
        <p className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          <Link
            href={REPORT_ROUTES.home}
            className="text-[var(--ds-text-primary)] underline-offset-2 hover:underline"
          >
            Select a workspace
          </Link>{" "}
          before creating projects.
        </p>
      ) : null}

      {creating ? (
        <CreateReportProjectForm onCancel={() => setCreating(false)} />
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

      {projects.length > 0 && !creating ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {projects.map((project) => {
            const isLastUsed = lastUsedProjectId === project.id;
            return (
            <li key={project.id} className={isLastUsed ? "max-md:order-first" : undefined}>
              <Link
                href={reportProjectReportPath(project.id)}
                className={
                  "block rounded-[var(--ds-radius-md)] no-underline outline-none " +
                  "transition-all duration-150 ease-out " +
                  "hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 " +
                  "focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
                }
              >
                <Card className="cursor-pointer transition-shadow duration-150 ease-out hover:shadow-[var(--ds-elevation-button-secondary-hover)]">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h2 className="m-0 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                          {project.name}
                        </h2>
                        {project.stage || project.code ? (
                          <dl className="m-0 hidden grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[length:var(--ds-text-sm)] md:grid">
                            {project.stage ? (
                              <>
                                <dt className="text-[var(--ds-text-secondary)]">Stage</dt>
                                <dd className="m-0 text-[var(--ds-text-primary)]">{project.stage}</dd>
                              </>
                            ) : null}
                            {project.code ? (
                              <>
                                <dt className="text-[var(--ds-text-secondary)]">Code</dt>
                                <dd className="m-0 text-[var(--ds-text-primary)]">{project.code}</dd>
                              </>
                            ) : null}
                          </dl>
                        ) : null}
                        {project.location ? (
                          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                            {project.location}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {project.stage ? (
                          <Badge
                            status="neutral"
                            variant="subtle"
                            className="report-project-stage-pill md:hidden"
                          >
                            {project.stage}
                          </Badge>
                        ) : null}
                        {isLastUsed ? (
                          <Badge status="info" variant="subtle" className="max-md:hidden">
                            Last used
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
