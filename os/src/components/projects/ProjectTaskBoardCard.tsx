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

type ProjectTaskBoardCardProps = {
  task: OsTask;
};

export function ProjectTaskBoardCard({ task }: ProjectTaskBoardCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

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
    <article
      className={`os-projects-board__card${editing ? " os-projects-board__card--editing" : ""}`}
    >
      {editing ? (
        <ProjectTaskInlineEditForm
          task={task}
          onCancel={handleEditCancel}
          onSaved={handleEditSaved}
        />
      ) : (
        <>
          <p className="os-projects-board__card-title">{task.title}</p>
          <p className="os-projects-board__card-meta">
            {priority ? (
              <span className="os-projects-board__card-priority">{priority}</span>
            ) : null}
            {priority && due ? (
              <span className="os-projects-board__card-meta-sep" aria-hidden>
                ·
              </span>
            ) : null}
            {due ? <span className="os-projects-board__card-due">Due {due}</span> : null}
          </p>
          {rowError ? (
            <p
              className="os-projects-board__card-error text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]"
              role="alert"
            >
              {rowError}
            </p>
          ) : null}
          <div className="os-projects-board__card-actions">
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={() => setEditing(true)}
              className="os-projects-board__card-action"
            >
              Edit
            </button>
            <form action={completeAction} className="os-projects-board__card-action-form">
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                disabled={actionsDisabled}
                className="os-projects-board__card-action os-projects-board__card-action--complete"
              >
                {completePending ? "…" : "Done"}
              </button>
            </form>
            <form
              action={archiveAction}
              className="os-projects-board__card-action-form"
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
                className="os-projects-board__card-action os-projects-board__card-action--archive"
              >
                {archivePending ? "…" : "Archive"}
              </button>
            </form>
          </div>
        </>
      )}
    </article>
  );
}
