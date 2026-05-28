import { redirect } from "next/navigation";
import { formatTaskDueDate, taskPriorityLabel } from "@/components/projects/task-display";
import { AllTasksRow } from "@/components/tasks/AllTasksRow";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import { osTaskDetailPath } from "@/lib/os-routes";
import { fetchActiveProjectsForUserId } from "@/lib/os/projects-data";
import { fetchActiveStreamsForUser } from "@/lib/os/streams-data";
import { fetchActiveTasksForUserId } from "@/lib/os/tasks-data";

export const dynamic = "force-dynamic";

function formatStatus(status: string | null | undefined): string | null {
  const value = status?.trim().toLowerCase();
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function AllTasksPage() {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const [tasks, streams, projects] = await Promise.all([
    fetchActiveTasksForUserId(userId),
    fetchActiveStreamsForUser(userId),
    fetchActiveProjectsForUserId(userId),
  ]);
  const streamNameById = new Map(streams.map((stream) => [stream.id, stream.name]));
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <main className="os-projects-page mx-auto flex w-full min-w-0 max-w-none flex-col px-4 py-5 sm:px-6 sm:py-7 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <header className="os-projects-page__intro max-md:px-3 max-md:pt-2">
        <p className="text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">Tasks</p>
        <h1 className="os-projects-page__title">All Tasks</h1>
        <p className="os-projects-page__lede">Every active task across OS.</p>
      </header>

      <section className="os-projects-list-section mt-5 flex flex-col gap-2.5 max-md:mt-2 max-md:gap-[0.375rem]">
        <div className="os-projects-surface">
          {tasks.length === 0 ? (
            <div className="os-projects-empty px-4 py-6 max-md:py-5">
              <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
                No active tasks.
              </p>
              <p className="mt-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                Completed work clears from this list automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_oklab,var(--ds-border)_55%,transparent)]">
              {tasks.map((task) => {
                const streamName = task.streamId ? streamNameById.get(task.streamId) : null;
                const projectName = task.projectId ? projectNameById.get(task.projectId) : null;
                const dueLabel = formatTaskDueDate(task.dueAt);
                const priority = taskPriorityLabel(task.priorityLevel);
                const status = formatStatus(task.status);

                const meta = [streamName, projectName, dueLabel ? `Due ${dueLabel}` : null, priority, status]
                  .filter(Boolean)
                  .map((part) => String(part));

                return (
                  <AllTasksRow
                    key={task.id}
                    taskId={task.id}
                    title={task.title}
                    meta={meta}
                    href={osTaskDetailPath(task.id)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
