import Link from "next/link";
import type { OsStream } from "@/lib/os/streams-data";
import { osStreamDetailPath } from "@/lib/os-routes";
import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";

type StreamsListProps = {
  streams: OsStream[];
  loadFailed?: boolean;
};

export function StreamsList({ streams, loadFailed = false }: StreamsListProps) {
  if (loadFailed) {
    return (
      <div className="os-streams-empty os-streams-empty--error" role="alert">
        <p className="os-streams-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          Couldn&apos;t load streams
        </p>
        <p className="os-streams-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="os-streams-empty">
        <p className="os-streams-empty__title text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
          No streams yet
        </p>
        <p className="os-streams-empty__hint text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
          Add a stream to group projects and tasks by theme.
        </p>
      </div>
    );
  }

  return (
    <ul className="os-streams-list">
      {streams.map((stream) => (
        <StreamRow key={stream.id} stream={stream} />
      ))}
    </ul>
  );
}

function StreamRow({ stream }: { stream: OsStream }) {
  const accent = streamAccentColor(stream.color);
  const icon = streamIconGlyph(stream);
  const description = stream.description?.trim();

  return (
    <li className="os-streams-list__item">
      <Link
        href={osStreamDetailPath(stream.id)}
        className="os-streams-row os-streams-row__link"
      >
        <div className="os-streams-row__leading">
          <span
            className="os-streams-row__icon"
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
              className="os-streams-row__color"
              style={{ backgroundColor: accent }}
              title={stream.color ?? undefined}
              aria-hidden
            />
          ) : (
            <span className="os-streams-row__color os-streams-row__color--muted" aria-hidden />
          )}
        </div>
        <div className="os-streams-row__body">
          <p className="os-streams-row__name">{stream.name}</p>
          {description ? (
            <p className="os-streams-row__description">{description}</p>
          ) : null}
        </div>
        <span className="os-streams-row__chevron" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}
