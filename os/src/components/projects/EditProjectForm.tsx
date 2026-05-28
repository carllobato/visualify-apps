"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  OS_PROJECT_FIELD_CLASS,
  OS_PROJECT_PRIMARY_BUTTON_CLASS,
} from "@/components/projects/project-form-styles";
import type { OsProject } from "@/lib/os/projects-data";
import type { OsStream } from "@/lib/os/streams-data";
import {
  updateProjectFromFormAction,
  type UpdateProjectFormState,
} from "@/lib/os/projects-actions";

type EditProjectFormProps = {
  project: OsProject;
  streams: OsStream[];
};

export function EditProjectForm({ project, streams }: EditProjectFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateProjectFormState | null,
    FormData
  >(updateProjectFromFormAction, null);

  const formKey = state?.savedAt ?? project.updatedAt;
  const showStreamSelect = streams.length > 0;
  const streamDefault = project.streamId ?? "";

  useEffect(() => {
    if (state?.savedAt && !state.error) {
      router.refresh();
    }
  }, [state?.savedAt, state?.error, router]);

  return (
    <section className="os-projects-edit" aria-labelledby="os-projects-edit-heading">
      <h2
        id="os-projects-edit-heading"
        className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Project settings
      </h2>
      <form
        key={formKey}
        action={formAction}
        className="os-projects-edit__form os-projects-surface flex flex-col gap-3 p-3 sm:p-3.5"
      >
        <input type="hidden" name="id" value={project.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-project-name" className="os-projects-field-label">
            Name
          </label>
          <input
            id="edit-project-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            maxLength={120}
            defaultValue={project.name}
            className={OS_PROJECT_FIELD_CLASS}
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-project-description" className="os-projects-field-label">
            Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <textarea
            id="edit-project-description"
            name="description"
            rows={2}
            maxLength={2000}
            defaultValue={project.description ?? ""}
            placeholder="What this project is aiming for"
            className={`${OS_PROJECT_FIELD_CLASS} resize-none leading-snug`}
            disabled={pending}
          />
        </div>

        {showStreamSelect ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-project-stream" className="os-projects-field-label">
              Stream <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
            </label>
            <select
              id="edit-project-stream"
              name="streamId"
              defaultValue={streamDefault}
              className={OS_PROJECT_FIELD_CLASS}
              disabled={pending}
            >
              <option value="">No stream</option>
              {streams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {state?.error ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]" role="alert">
            {state.error}
          </p>
        ) : null}

        {state?.savedAt && !state.error ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]" role="status">
            Saved.
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={OS_PROJECT_PRIMARY_BUTTON_CLASS}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
