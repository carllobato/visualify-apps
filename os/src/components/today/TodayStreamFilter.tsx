import Link from "next/link";
import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";
import type { TodayStream } from "@/lib/today-data";
import {
  todayStreamFilterHref,
  type TodayStreamFilter,
} from "@/lib/today-stream-filter";
type TodayStreamFilterProps = {
  streams: TodayStream[];
  activeFilter: TodayStreamFilter;
};

export function TodayStreamFilterBar({ streams, activeFilter }: TodayStreamFilterProps) {
  const allActive = activeFilter.kind === "all";

  return (
    <section className="os-today-focus" aria-label="Stream focus">
      <p className="os-today-focus__eyebrow text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)] max-md:sr-only">
        Focus
      </p>
      <div className="os-today-focus__scroll">
        <div className="os-today-focus__chips" role="list">
          <Link
            href={todayStreamFilterHref("all")}
            className={`os-today-focus-chip${allActive ? " os-today-focus-chip--active" : ""}`}
            role="listitem"
            aria-current={allActive ? "true" : undefined}
          >
            All
          </Link>

          {streams.map((stream) => {
            const isActive =
              activeFilter.kind === "stream" && activeFilter.streamId === stream.id;
            const accent = streamAccentColor(stream.color);
            const icon = streamIconGlyph(stream);

            return (
              <Link
                key={stream.id}
                href={todayStreamFilterHref(stream.id)}
                className={`os-today-focus-chip${isActive ? " os-today-focus-chip--active" : ""}`}
                role="listitem"
                aria-current={isActive ? "true" : undefined}
              >
                {accent ? (
                  <span
                    className="os-today-focus-chip__dot"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                ) : null}
                <span className="os-today-focus-chip__icon" aria-hidden>
                  {icon}
                </span>
                <span className="os-today-focus-chip__label">{stream.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      {activeFilter.kind === "stream" ? (
        <p className="os-today-focus__active text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]">
          Showing tasks due today in{" "}
          <span className="font-medium text-[var(--ds-text-secondary)]">{activeFilter.stream.name}</span>
          <span className="sr-only"> Daily briefing is not filtered by stream.</span>
        </p>
      ) : null}
    </section>
  );
}
