import { ProjectTaskRow } from "@/components/projects/ProjectTaskRow";
import type { OsTask } from "@/lib/os/tasks-data";

type ProjectTaskListProps = {
  tasks: OsTask[];
  loadFailed?: boolean;
};

export function ProjectTaskList({ tasks, loadFailed = false }: ProjectTaskListProps) {
  if (loadFailed) {
    return (
      <div className="os-projects-empty os-projects-empty--error" role="alert">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          Couldn&apos;t load tasks
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="os-projects-empty">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No tasks yet
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Add a task to track work for this project.
        </p>
      </div>
    );
  }

  return (
    <ul className="os-projects-task-list">
      {tasks.map((task) => (
        <ProjectTaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
