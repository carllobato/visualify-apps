"use client";

import { useCallback, useEffect, useRef } from "react";

type InboxCaptureFormProps = {
  action: (formData: FormData) => Promise<void>;
};

const TEXTAREA_MAX_HEIGHT_PX = 220;

export function InboxCaptureForm({ action }: InboxCaptureFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    syncHeight();
  }, [syncHeight]);

  return (
    <form action={action} className="os-inbox-capture__form os-inbox-surface">
      <div className="os-inbox-capture__body">
        <div className="os-inbox-capture__scratchpad">
          <label htmlFor="rawContent" className="sr-only">
            Capture thought
          </label>
          <textarea
            ref={textareaRef}
            id="rawContent"
            name="rawContent"
            rows={2}
            className="os-inbox-capture__input"
            placeholder="Capture a thought…"
            autoComplete="off"
            spellCheck
            required
            onInput={syncHeight}
          />
        </div>
        <div className="os-inbox-capture__bar">
          <button type="submit" className="os-inbox-capture__submit">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
