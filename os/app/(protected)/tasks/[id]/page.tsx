import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatTaskDueDate, taskPriorityLabel } from "@/components/projects/task-display";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { osProjectDetailPath, OS_ROUTES } from "@/lib/os-routes";
import { fetchProjectByIdForUserId } from "@/lib/os/projects-data";
import { fetchStreamByIdForUserId } from "@/lib/os/streams-data";
import { fetchTaskByIdForUserId } from "@/lib/os/tasks-data";

export const dynamic = "force-dynamic";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatStatus(status: string | null | undefined): string {
  const value = status?.trim().toLowerCase();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const task = await fetchTaskByIdForUserId(userId, id);
  if (!task) {
    notFound();
  }

  const [stream, project] = await Promise.all([
    task.streamId ? fetchStreamByIdForUserId(userId, task.streamId) : Promise.resolve(null),
    task.projectId ? fetchProjectByIdForUserId(userId, task.projectId) : Promise.resolve(null),
  ]);

  const description = task.description?.trim() || null;
  const priority = taskPriorityLabel(task.priorityLevel);
  const due = formatTaskDueDate(task.dueAt);
  const createdAt = formatDateTime(task.createdAt);
  const updatedAt = formatDateTime(task.updatedAt);
  const status = formatStatus(task.status);

  return (
    <main className="os-projects-page mx-auto flex w-full min-w-0 max-w-none flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <Link
        href={OS_ROUTES.allTasks}
        className="os-projects-back text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)] transition-colors hover:text-[var(--ds-text-primary)] max-md:mx-3 max-md:mt-2 max-md:mb-0"
      >
        ← All Tasks
      </Link>

      <section className="os-projects-feed mt-4 flex flex-col gap-4 sm:gap-5 max-md:mt-2 max-md:gap-2.5">
        <header className="os-projects-page__intro max-md:px-3">
          <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Task</p>
          <h1 className="text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)] sm:text-[length:var(--ds-text-2xl)]">
            {task.title}
          </h1>
        </header>

        <div className="os-projects-surface">
          <section className="p-4 sm:p-5" aria-label="Task details">
            <h2 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
              Details
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Status</dt>
                <dd className="mt-0.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                  {status}
                </dd>
              </div>
              {priority ? (
                <div>
                  <dt className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Priority</dt>
                  <dd className="mt-0.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    {priority}
                  </dd>
                </div>
              ) : null}
              {due ? (
                <div>
                  <dt className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Due</dt>
                  <dd className="mt-0.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    {due}
                  </dd>
                </div>
              ) : null}
              {stream?.name ? (
                <div>
                  <dt className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Stream</dt>
                  <dd className="mt-0.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    {stream.name}
                  </dd>
                </div>
              ) : null}
              {project?.name ? (
                <div className="sm:col-span-2">
                  <dt className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">Project</dt>
                  <dd className="mt-0.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                    <Link
                      href={osProjectDetailPath(project.id)}
                      className="rounded-[4px] text-[var(--ds-text-primary)] transition-colors hover:text-[var(--ds-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-text-secondary)_35%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ds-surface)]"
                    >
                      {project.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        {description ? (
          <div className="os-projects-surface">
            <section className="p-4 sm:p-5" aria-label="Task notes">
              <h2 className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
                Notes
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-primary)]">
                {description}
              </p>
            </section>
          </div>
        ) : null}

        {(createdAt || updatedAt) ? (
          <footer className="max-md:px-3">
            <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
              {createdAt ? `Created ${createdAt}` : ""}
              {createdAt && updatedAt ? " · " : ""}
              {updatedAt ? `Updated ${updatedAt}` : ""}
            </p>
          </footer>
        ) : null}
      </section>
    </main>
  );
}
