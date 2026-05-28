"use client";

import { useActionState } from "react";
import {
  OS_STREAM_FIELD_CLASS,
  OS_STREAM_PRIMARY_BUTTON_CLASS,
} from "@/components/streams/stream-form-styles";
import {
  createStreamFromFormAction,
  type CreateStreamFormState,
} from "@/lib/os/streams-actions";

type CreateStreamFormProps = {
  /** Changes after a successful create so the form resets. */
  formKey: number;
};

export function CreateStreamForm({ formKey }: CreateStreamFormProps) {
  const [state, formAction, pending] = useActionState<
    CreateStreamFormState | null,
    FormData
  >(createStreamFromFormAction, null);

  return (
    <section className="os-streams-create" aria-labelledby="os-streams-create-heading">
      <h2
        id="os-streams-create-heading"
        className="os-streams-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        New stream
      </h2>
      <form
        key={formKey}
        action={formAction}
        className="os-streams-create__form os-streams-surface flex flex-col gap-3 p-3 sm:p-3.5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stream-name" className="os-streams-field-label">
            Name
          </label>
          <input
            id="stream-name"
            name="name"
            type="text"
            required
            autoComplete="off"
            maxLength={120}
            placeholder="e.g. Product, Health, Side projects"
            className={OS_STREAM_FIELD_CLASS}
            disabled={pending}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stream-icon" className="os-streams-field-label">
              Icon
            </label>
            <input
              id="stream-icon"
              name="icon"
              type="text"
              autoComplete="off"
              maxLength={64}
              placeholder="◎"
              className={OS_STREAM_FIELD_CLASS}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stream-color" className="os-streams-field-label">
              Colour
            </label>
            <input
              id="stream-color"
              name="color"
              type="text"
              autoComplete="off"
              maxLength={32}
              placeholder="#5b7c99"
              className={OS_STREAM_FIELD_CLASS}
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stream-description" className="os-streams-field-label">
            Description <span className="font-normal text-[var(--ds-text-muted)]">(optional)</span>
          </label>
          <textarea
            id="stream-description"
            name="description"
            rows={2}
            maxLength={2000}
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

        <button
          type="submit"
          disabled={pending}
          className={`os-streams-create__submit ${OS_STREAM_PRIMARY_BUTTON_CLASS}`}
        >
          {pending ? "Adding…" : "Add stream"}
        </button>
      </form>
    </section>
  );
}
