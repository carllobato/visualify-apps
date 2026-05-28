"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  OS_PROJECT_FIELD_CLASS,
  OS_PROJECT_PRIMARY_BUTTON_CLASS,
} from "@/components/projects/project-form-styles";
import {
  TASK_PRIORITY_OPTIONS,
  taskDueAtToDateInputValue,
  taskPrioritySelectValue,
} from "@/components/projects/task-display";
import type { OsTask } from "@/lib/os/tasks-data";
import {
  updateTaskFromFormAction,
  type UpdateTaskFormState,
} from "@/lib/os/tasks-actions";

type ProjectTaskInlineEditFormProps = {
  task: OsTask;
  onCancel: () => void;
  onSaved: () => void;
};

export function ProjectTaskInlineEditForm({
  task,
  onCancel,
  onSaved,
}: ProjectTaskInlineEditFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<UpdateTaskFormState | null, FormData>(
    updateTaskFromFormAction,
    null,
  );

  const formKey = state?.savedAt ?? task.updatedAt;
  const priorityDefault = taskPrioritySelectValue(task.priorityLevel);
  const dueDefault = taskDueAtToDateInputValue(task.dueAt);

  useEffect(() => {
    if (state?.savedAt && !state.error) {
      router.refresh();
      onSaved();
    }
  }, [state?.savedAt, state?.error, router, onSaved]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="os-projects-task-row__edit flex w-full min-w-0 flex-col gap-2.5"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={task.id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`edit-task-title-${task.id}`} className="os-projects-field-label">
          Title
        </label>
        <input
          id={`edit-task-title-${task.id}`}
          name="title"
          type="text"
          required
          autoComplete="off"
          maxLength={200}
          defaultValue={task.title}
          className={OS_PROJECT_FIELD_CLASS}
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`edit-task-description-${task.id}`} className="os-projects-field-label">
          Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
        </label>
        <textarea
          id={`edit-task-description-${task.id}`}
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={task.description ?? ""}
          placeholder="Extra context"
          className={`${OS_PROJECT_FIELD_CLASS} resize-none leading-snug`}
          disabled={pending}
        />
      </div>

      <div className="os-projects-task-row__edit-meta grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`edit-task-priority-${task.id}`} className="os-projects-field-label">
            Priority
          </label>
          <select
            id={`edit-task-priority-${task.id}`}
            name="priorityLevel"
            defaultValue={priorityDefault}
            className={OS_PROJECT_FIELD_CLASS}
            disabled={pending}
          >
            {TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`edit-task-due-${task.id}`} className="os-projects-field-label">
            Due date <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <input
            id={`edit-task-due-${task.id}`}
            name="dueAt"
            type="date"
            defaultValue={dueDefault}
            className={OS_PROJECT_FIELD_CLASS}
            disabled={pending}
          />
        </div>
      </div>

      {state?.error ? (
        <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="os-projects-task-row__edit-actions flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`os-projects-task-row__edit-save ${OS_PROJECT_PRIMARY_BUTTON_CLASS} !min-h-9 px-3 py-2 text-[length:var(--ds-text-xs)]`}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="os-projects-task-row__action os-projects-task-row__action--cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
