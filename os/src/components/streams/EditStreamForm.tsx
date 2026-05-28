"use client";

import { useActionState } from "react";
import type { OsStream } from "@/lib/os/streams-data";
import {
  OS_STREAM_FIELD_CLASS,
  OS_STREAM_PRIMARY_BUTTON_CLASS,
} from "@/components/streams/stream-form-styles";
import {
  updateStreamFromFormAction,
  type UpdateStreamFormState,
} from "@/lib/os/streams-actions";

type EditStreamFormProps = {
  stream: OsStream;
};

export function EditStreamForm({ stream }: EditStreamFormProps) {
  const [state, formAction, pending] = useActionState<
    UpdateStreamFormState | null,
    FormData
  >(updateStreamFromFormAction, null);

  const formKey = state?.savedAt ?? stream.updatedAt;

  return (
    <section className="os-streams-edit" aria-labelledby="os-streams-edit-heading">
      <h2
        id="os-streams-edit-heading"
        className="os-streams-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Edit stream
      </h2>
      <form
        key={formKey}
        action={formAction}
        className="os-streams-edit__form os-streams-surface flex flex-col gap-3 p-3 sm:p-3.5"
      >
        <input type="hidden" name="id" value={stream.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-stream-name" className="os-streams-field-label">
            Name
          </label>
          <input
            id="edit-stream-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            maxLength={120}
            defaultValue={stream.name}
            className={OS_STREAM_FIELD_CLASS}
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-stream-icon" className="os-streams-field-label">
              Icon
            </label>
            <input
              id="edit-stream-icon"
              name="icon"
              type="text"
              autoComplete="off"
              maxLength={64}
              defaultValue={stream.icon ?? ""}
              placeholder="◎"
              className={OS_STREAM_FIELD_CLASS}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-stream-color" className="os-streams-field-label">
              Colour
            </label>
            <input
              id="edit-stream-color"
              name="color"
              type="text"
              autoComplete="off"
              maxLength={32}
              defaultValue={stream.color ?? ""}
              placeholder="#5b7c99"
              className={OS_STREAM_FIELD_CLASS}
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-stream-description" className="os-streams-field-label">
            Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <textarea
            id="edit-stream-description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={stream.description ?? ""}
            placeholder="What this stream is for"
            className={`${OS_STREAM_FIELD_CLASS} resize-none leading-snug`}
            disabled={pending}
          />
        </div>

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

        <button
          type="submit"
          disabled={pending}
          className={OS_STREAM_PRIMARY_BUTTON_CLASS}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
