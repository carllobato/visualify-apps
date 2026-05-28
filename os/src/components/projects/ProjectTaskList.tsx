import { ProjectTaskRow } from "@/components/projects/ProjectTaskRow";
import type { OsTask } from "@/lib/os/tasks-data";
import type { OsWaitingOn } from "@/lib/os/waiting-ons-data";
import { ProjectWaitingOnRow } from "./ProjectWaitingOnRow";

type ProjectTaskListProps = {
  tasks: OsTask[];
  waitingOns: OsWaitingOn[];
  tasksLoadFailed?: boolean;
  waitingOnsLoadFailed?: boolean;
};

export function ProjectTaskList({
  tasks,
  waitingOns,
  tasksLoadFailed = false,
  waitingOnsLoadFailed = false,
}: ProjectTaskListProps) {
  if (tasksLoadFailed || waitingOnsLoadFailed) {
    return (
      <div className="os-projects-empty os-projects-empty--error" role="alert">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          Couldn&apos;t load project work
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (tasks.length === 0 && waitingOns.length === 0) {
    return (
      <div className="os-projects-empty">
        <p className="os-projects-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No project work yet
        </p>
        <p className="os-projects-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Add a task to track work for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="os-projects-task-list-groups">
      {tasks.length > 0 ? (
        <ul className="os-projects-task-list">
          {tasks.map((task) => (
            <ProjectTaskRow key={task.id} task={task} />
          ))}
        </ul>
      ) : null}
      <section className="os-projects-task-waiting-on-section" aria-label="Waiting On">
        <h3 className="os-projects-task-waiting-on-section__title">Waiting On</h3>
        {waitingOns.length > 0 ? (
          <ul className="os-projects-task-list os-projects-task-list--waiting-on">
            {waitingOns.map((waitingOn) => (
              <ProjectWaitingOnRow key={waitingOn.id} waitingOn={waitingOn} />
            ))}
          </ul>
        ) : (
          <p className="os-projects-task-waiting-on-section__empty">No active waiting-ons</p>
        )}
      </section>
    </div>
  );
}
