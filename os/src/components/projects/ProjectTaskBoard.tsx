"use client";

import { useMemo } from "react";
import { ProjectTaskBoardCard } from "@/components/projects/ProjectTaskBoardCard";
import { groupTasksForProjectBoard } from "@/components/projects/project-task-board";
import type { OsTask } from "@/lib/os/tasks-data";

type ProjectTaskBoardProps = {
  tasks: OsTask[];
  loadFailed?: boolean;
};

export function ProjectTaskBoard({ tasks, loadFailed = false }: ProjectTaskBoardProps) {
  const columns = useMemo(() => groupTasksForProjectBoard(tasks), [tasks]);

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
    <div className="os-projects-board">
      <div className="os-projects-board__scroll" role="region" aria-label="Task board">
        {columns.map((column) => (
          <section
            key={column.id}
            className={`os-projects-board__column os-projects-board__column--${column.id}`}
            aria-labelledby={`os-projects-board-${column.id}-heading`}
          >
            <header className="os-projects-board__column-header">
              <h3
                id={`os-projects-board-${column.id}-heading`}
                className="os-projects-board__column-title"
              >
                {column.label}
              </h3>
              <span className="os-projects-board__column-count" aria-label={`${column.tasks.length} tasks`}>
                {column.tasks.length}
              </span>
            </header>
            <div className="os-projects-board__cards">
              {column.tasks.length === 0 ? (
                <div className="os-projects-board__column-empty-wrap">
                  <p className="os-projects-board__column-empty">No tasks in this column</p>
                </div>
              ) : (
                column.tasks.map((task) => <ProjectTaskBoardCard key={task.id} task={task} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
