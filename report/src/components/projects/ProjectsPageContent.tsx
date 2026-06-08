"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@visualify/design-system";
import { navigateAfterAppShellRouteTransition } from "@visualify/app-shell";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import { CreateReportProjectForm } from "@/components/projects/CreateReportProjectForm";
import "@/components/layout/report-mobile-pages.css";
import { writeReportLastProjectIdForWorkspace } from "@/lib/projects/report-last-project-preference";
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
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const lastUsedProjectId = useReportLastProjectIdForWorkspace(workspaceId, pathname);

  async function openProject(projectId: string) {
    if (busyId) return;
    setBusyId(projectId);
    if (workspaceId?.trim()) {
      writeReportLastProjectIdForWorkspace(workspaceId, projectId);
    }
    await navigateAfterAppShellRouteTransition(router, reportProjectReportPath(projectId));
  }

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
        <ul className="m-0 flex list-none flex-col gap-2 p-0 md:gap-3">
          {projects.map((project) => {
            const busy = busyId === project.id;
            const isLastUsed = lastUsedProjectId === project.id;
            const showDesktopStatus = !busy;
            return (
            <li key={project.id} className={isLastUsed ? "max-md:order-first" : undefined}>
              <Button
                type="button"
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => openProject(project.id)}
                className={[
                  "h-auto w-full justify-between gap-3 px-4 py-3 text-left md:hidden",
                  isLastUsed ? "outline outline-2 outline-offset-0 outline-[var(--ds-primary)]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="flex min-w-0 flex-1 items-center gap-x-2">
                  <span className="min-w-0 truncate font-medium">{project.name}</span>
                  {project.stage ? (
                    <Badge
                      status="neutral"
                      variant="subtle"
                      className="report-project-stage-pill shrink-0"
                    >
                      {project.stage}
                    </Badge>
                  ) : null}
                </span>
                {busy ? (
                  <span className="shrink-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                    Selecting…
                  </span>
                ) : isLastUsed ? (
                  <Badge status="info" variant="subtle" className="shrink-0">
                    Last used
                  </Badge>
                ) : null}
              </Button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => openProject(project.id)}
                className={[
                  "hidden w-full rounded-[var(--ds-radius-md)] border-0 bg-transparent p-0 text-left no-underline outline-none md:block",
                  "transition-all duration-150 ease-out",
                  "hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2",
                  "focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]",
                  "disabled:cursor-default",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Card
                  className={[
                    "cursor-pointer transition-shadow duration-150 ease-out hover:shadow-[var(--ds-elevation-button-secondary-hover)]",
                    isLastUsed ? "outline outline-2 outline-offset-0 outline-[var(--ds-primary)]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <h2 className="m-0 text-[length:var(--ds-text-base)] font-semibold text-[var(--ds-text-primary)]">
                            {project.name}
                          </h2>
                        </div>
                        {project.stage || project.code ? (
                          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[length:var(--ds-text-sm)]">
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
                      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 self-center">
                        {showDesktopStatus ? (
                          <ReportRagStatusDot
                            status={project.overallStatus}
                            className="report-project-list-rag"
                          />
                        ) : null}
                        {busy ? (
                          <span className="shrink-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                            Selecting…
                          </span>
                        ) : isLastUsed ? (
                          <Badge status="info" variant="subtle" className="shrink-0">
                            Last used
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
