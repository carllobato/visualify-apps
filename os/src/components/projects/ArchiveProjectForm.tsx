"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { OS_PROJECT_ARCHIVE_BUTTON_CLASS } from "@/components/projects/project-form-styles";
import { OS_ROUTES } from "@/lib/os-routes";
import {
  archiveProjectFromFormAction,
  type ArchiveProjectFormState,
} from "@/lib/os/projects-actions";

type ArchiveProjectFormProps = {
  projectId: string;
  projectName: string;
};

export function ArchiveProjectForm({ projectId, projectName }: ArchiveProjectFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ArchiveProjectFormState | null,
    FormData
  >(archiveProjectFromFormAction, null);

  useEffect(() => {
    if (state?.archived) {
      router.push(OS_ROUTES.projects);
    }
  }, [state?.archived, router]);

  return (
    <section className="os-projects-archive" aria-labelledby="os-projects-archive-heading">
      <h2
        id="os-projects-archive-heading"
        className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Archive
      </h2>
      <form
        action={formAction}
        className="os-projects-archive__form flex flex-col gap-2"
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Archive “${projectName}”? It will be removed from your active projects list.`,
          );
          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={projectId} />
        <p className="os-projects-archive__hint text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
          Archiving hides this project from your list. Tasks are not deleted.
        </p>
        {state?.error ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={OS_PROJECT_ARCHIVE_BUTTON_CLASS}>
          {pending ? "Archiving…" : "Archive project"}
        </button>
      </form>
    </section>
  );
}
