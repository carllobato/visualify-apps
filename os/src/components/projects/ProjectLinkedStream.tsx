import Link from "next/link";
import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";
import type { OsStream } from "@/lib/os/streams-data";
import { osStreamDetailPath } from "@/lib/os-routes";

export function ProjectLinkedStream({ stream }: { stream: OsStream }) {
  const accent = streamAccentColor(stream.color);
  const icon = streamIconGlyph(stream);

  return (
    <section
      className="os-projects-linked-stream flex flex-col gap-2.5 max-md:gap-[0.375rem]"
      aria-labelledby="os-projects-linked-stream-heading"
    >
      <h2
        id="os-projects-linked-stream-heading"
        className="os-projects-block__label text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]"
      >
        Stream
      </h2>
      <div className="os-projects-surface">
        <Link href={osStreamDetailPath(stream.id)} className="os-projects-linked-stream__link">
          <span
            className="os-projects-linked-stream__icon"
            style={
              accent
                ? {
                    backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--ds-surface))`,
                    color: accent,
                  }
                : undefined
            }
            aria-hidden
          >
            {icon}
          </span>
          {accent ? (
            <span
              className="os-projects-linked-stream__accent"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          ) : (
            <span
              className="os-projects-linked-stream__accent os-projects-linked-stream__accent--muted"
              aria-hidden
            />
          )}
          <span className="os-projects-linked-stream__name">{stream.name}</span>
          <span className="os-projects-linked-stream__chevron" aria-hidden>
            ›
          </span>
        </Link>
      </div>
    </section>
  );
}
