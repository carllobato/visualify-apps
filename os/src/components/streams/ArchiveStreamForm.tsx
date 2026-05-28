"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { OS_STREAM_ARCHIVE_BUTTON_CLASS } from "@/components/streams/stream-form-styles";
import { OS_ROUTES } from "@/lib/os-routes";
import {
  archiveStreamFromFormAction,
  type ArchiveStreamFormState,
} from "@/lib/os/streams-actions";

type ArchiveStreamFormProps = {
  streamId: string;
  streamName: string;
};

export function ArchiveStreamForm({ streamId, streamName }: ArchiveStreamFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ArchiveStreamFormState | null,
    FormData
  >(archiveStreamFromFormAction, null);

  useEffect(() => {
    if (state?.archived) {
      router.push(OS_ROUTES.streams);
    }
  }, [state?.archived, router]);

  return (
    <section className="os-streams-archive" aria-labelledby="os-streams-archive-heading">
      <h2
        id="os-streams-archive-heading"
        className="os-streams-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Archive
      </h2>
      <form
        action={formAction}
        className="os-streams-archive__form flex flex-col gap-2"
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Archive “${streamName}”? It will be removed from your active streams list.`,
          );
          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={streamId} />
        <p className="os-streams-archive__hint text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
          Archiving hides this stream from your list. Related projects and tasks are not deleted.
        </p>
        {state?.error ? (
          <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-danger,#b42318)]" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={OS_STREAM_ARCHIVE_BUTTON_CLASS}>
          {pending ? "Archiving…" : "Archive stream"}
        </button>
      </form>
    </section>
  );
}
