"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";
import { ProjectTaskInlineEditForm } from "@/components/projects/ProjectTaskInlineEditForm";
import {
  formatTaskDueDate,
  taskPriorityLabel,
} from "@/components/projects/task-display";
import type { OsTask } from "@/lib/os/tasks-data";
import {
  archiveTaskFromFormAction,
  completeTaskFromFormAction,
  type TaskRowActionFormState,
} from "@/lib/os/tasks-actions";

type ProjectTaskRowProps = {
  task: OsTask;
};

export function ProjectTaskRow({ task }: ProjectTaskRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const description = task.description?.trim();
  const priority = taskPriorityLabel(task.priorityLevel);
  const due = formatTaskDueDate(task.dueAt);

  const [completeState, completeAction, completePending] = useActionState<
    TaskRowActionFormState | null,
    FormData
  >(completeTaskFromFormAction, null);

  const [archiveState, archiveAction, archivePending] = useActionState<
    TaskRowActionFormState | null,
    FormData
  >(archiveTaskFromFormAction, null);

  const rowError = completeState?.error ?? archiveState?.error;
  const actionsDisabled = completePending || archivePending || editing;

  useEffect(() => {
    if (completeState && !completeState.error) {
      router.refresh();
    }
  }, [completeState, router]);

  useEffect(() => {
    if (archiveState && !archiveState.error) {
      router.refresh();
    }
  }, [archiveState, router]);

  const handleEditSaved = useCallback(() => {
    setEditing(false);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <li className="os-projects-task-list__item">
      <div
        className={`os-projects-task-row${editing ? " os-projects-task-row--editing" : ""}`}
      >
        {editing ? (
          <ProjectTaskInlineEditForm
            task={task}
            onCancel={handleEditCancel}
            onSaved={handleEditSaved}
          />
        ) : (
          <>
            <div className="os-projects-task-row__body">
              <p className="os-projects-task-row__title">{task.title}</p>
              {description ? (
                <p className="os-projects-task-row__description">{description}</p>
              ) : null}
              <p className="os-projects-task-row__meta">
                {priority ? (
                  <span className="os-projects-task-row__priority">{priority}</span>
                ) : null}
                {priority && due ? (
                  <span className="os-projects-task-row__meta-sep" aria-hidden>
                    ·
                  </span>
                ) : null}
                {due ? <span className="os-projects-task-row__due">Due {due}</span> : null}
              </p>
              {rowError ? (
                <p
                  className="os-projects-task-row__error text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]"
                  role="alert"
                >
                  {rowError}
                </p>
              ) : null}
            </div>

            <div className="os-projects-task-row__actions">
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => setEditing(true)}
                className="os-projects-task-row__action os-projects-task-row__action--edit"
              >
                Edit
              </button>
              <form action={completeAction} className="os-projects-task-row__action-form">
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  disabled={actionsDisabled}
                  className="os-projects-task-row__action os-projects-task-row__action--complete"
                >
                  {completePending ? "…" : "Complete"}
                </button>
              </form>
              <form
                action={archiveAction}
                className="os-projects-task-row__action-form"
                onSubmit={(event) => {
                  const confirmed = window.confirm(`Archive “${task.title}”?`);
                  if (!confirmed) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  disabled={actionsDisabled}
                  className="os-projects-task-row__action os-projects-task-row__action--archive"
                >
                  {archivePending ? "…" : "Archive"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
