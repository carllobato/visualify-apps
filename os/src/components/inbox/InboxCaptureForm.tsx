"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";

type InboxCaptureFormProps = {
  action: (formData: FormData) => Promise<void>;
  streams: Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  }>;
};

const TEXTAREA_MAX_HEIGHT_PX = 220;

export function InboxCaptureForm({ action, streams }: InboxCaptureFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const selectedStreamName = useMemo(
    () => streams.find((stream) => stream.id === selectedStreamId)?.name ?? "",
    [selectedStreamId, streams],
  );

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
    <form action={action} className="os-inbox-capture__form">
      {streams.length > 0 ? (
        <section className="os-inbox-focus" aria-label="Capture stream context">
          <div className="os-inbox-focus__scroll">
            <div className="os-inbox-focus__chips">
              <button
                type="button"
                className={`os-inbox-focus-chip${selectedStreamId ? "" : " os-inbox-focus-chip--active"}`}
                aria-pressed={selectedStreamId ? "false" : "true"}
                onClick={() => setSelectedStreamId("")}
              >
                All
              </button>
              {streams.map((stream) => {
                const isActive = selectedStreamId === stream.id;
                const accent = streamAccentColor(stream.color);
                const icon = streamIconGlyph(stream);
                return (
                  <button
                    key={stream.id}
                    type="button"
                    className={`os-inbox-focus-chip${isActive ? " os-inbox-focus-chip--active" : ""}`}
                    aria-pressed={isActive ? "true" : "false"}
                    onClick={() => setSelectedStreamId(stream.id)}
                  >
                    {accent ? (
                      <span
                        className="os-inbox-focus-chip__dot"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="os-inbox-focus-chip__icon" aria-hidden>
                      {icon}
                    </span>
                    <span className="os-inbox-focus-chip__label">{stream.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
      <div className="os-inbox-capture__surface os-inbox-surface">
        <input type="hidden" name="streamContextName" value={selectedStreamName} />
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
            <p className="os-inbox-capture__context">
              {selectedStreamName ? `In ${selectedStreamName}` : "All streams"}
            </p>
            <button type="submit" className="os-inbox-capture__submit">
              Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
