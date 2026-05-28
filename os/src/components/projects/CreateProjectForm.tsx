"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  OS_PROJECT_FIELD_CLASS,
  OS_PROJECT_PRIMARY_BUTTON_CLASS,
} from "@/components/projects/project-form-styles";
import type { OsStream } from "@/lib/os/streams-data";
import {
  createProjectFromFormAction,
  type CreateProjectFormState,
} from "@/lib/os/projects-actions";

type CreateProjectFormProps = {
  /** Changes after a successful create so the form resets. */
  formKey: number;
  streams: OsStream[];
};

export function CreateProjectForm({ formKey, streams }: CreateProjectFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    CreateProjectFormState | null,
    FormData
  >(createProjectFromFormAction, null);

  useEffect(() => {
    if (state && !state.error) {
      router.refresh();
    }
  }, [state, router]);

  const showStreamSelect = streams.length > 0;

  return (
    <section className="os-projects-create" aria-labelledby="os-projects-create-heading">
      <h2
        id="os-projects-create-heading"
        className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        New project
      </h2>
      <form
        key={formKey}
        action={formAction}
        className="os-projects-create__form os-projects-surface flex flex-col gap-3 p-3 sm:p-3.5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="os-projects-field-label">
            Name
          </label>
          <input
            id="project-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            maxLength={120}
            placeholder="e.g. Launch Q3 roadmap"
            className={OS_PROJECT_FIELD_CLASS}
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-description" className="os-projects-field-label">
            Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <textarea
            id="project-description"
            name="description"
            rows={2}
            maxLength={2000}
            placeholder="What this project is aiming for"
            className={`${OS_PROJECT_FIELD_CLASS} resize-none leading-snug`}
            disabled={pending}
          />
        </div>

        {showStreamSelect ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-stream" className="os-projects-field-label">
              Stream <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
            </label>
            <select
              id="project-stream"
              name="streamId"
              defaultValue=""
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

        <button
          type="submit"
          disabled={pending}
          className={`os-projects-create__submit ${OS_PROJECT_PRIMARY_BUTTON_CLASS}`}
        >
          {pending ? "Adding…" : "Add project"}
        </button>
      </form>
    </section>
  );
}
