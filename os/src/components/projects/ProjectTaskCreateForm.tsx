"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  OS_PROJECT_FIELD_CLASS,
  OS_PROJECT_PRIMARY_BUTTON_CLASS,
} from "@/components/projects/project-form-styles";
import { TASK_PRIORITY_OPTIONS } from "@/components/projects/task-display";
import {
  createTaskFromFormAction,
  type CreateProjectTaskFormState,
} from "@/lib/os/tasks-actions";

type ProjectTaskCreateFormProps = {
  projectId: string;
  streamId: string | null;
  /** Changes after a successful create so the form resets. */
  formKey: number;
};

export function ProjectTaskCreateForm({
  projectId,
  streamId,
  formKey,
}: ProjectTaskCreateFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateProjectTaskFormState | null,
    FormData
  >(createTaskFromFormAction, null);

  useEffect(() => {
    if (state && !state.error) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="os-projects-task-create__form os-projects-surface flex flex-col gap-3 p-3 sm:p-3.5"
    >
      <input type="hidden" name="projectId" value={projectId} />
      {streamId ? <input type="hidden" name="streamId" value={streamId} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="os-projects-field-label">
          Title
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          autoComplete="off"
          maxLength={200}
          placeholder="What needs doing?"
          className={OS_PROJECT_FIELD_CLASS}
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-description" className="os-projects-field-label">
          Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
        </label>
        <textarea
          id="task-description"
          name="description"
          rows={2}
          maxLength={2000}
          placeholder="Extra context"
          className={`${OS_PROJECT_FIELD_CLASS} resize-none leading-snug`}
          disabled={pending}
        />
      </div>

      <div className="os-projects-task-create__meta grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-priority" className="os-projects-field-label">
            Priority
          </label>
          <select
            id="task-priority"
            name="priorityLevel"
            defaultValue="medium"
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
          <label htmlFor="task-due" className="os-projects-field-label">
            Due date <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <input
            id="task-due"
            name="dueAt"
            type="date"
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

      <button
        type="submit"
        disabled={pending}
        className={`os-projects-task-create__submit ${OS_PROJECT_PRIMARY_BUTTON_CLASS}`}
      >
        {pending ? "Adding…" : "Add task"}
      </button>
    </form>
  );
}
