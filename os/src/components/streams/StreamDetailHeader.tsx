import type { OsStream } from "@/lib/os/streams-data";
import { streamAccentColor, streamIconGlyph } from "@/components/streams/stream-display";

export function StreamDetailHeader({ stream }: { stream: OsStream }) {
  const accent = streamAccentColor(stream.color);
  const icon = streamIconGlyph(stream);
  const description = stream.description?.trim();

  return (
    <header className="os-streams-detail-hero os-streams-surface">
      <div className="os-streams-detail-hero__identity">
        <span
          className="os-streams-detail-hero__icon"
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
        <div className="os-streams-detail-hero__text">
          <div className="os-streams-detail-hero__title-row">
            <h1 className="os-streams-detail-hero__name">{stream.name}</h1>
            {accent ? (
              <span
                className="os-streams-detail-hero__color"
                style={{ backgroundColor: accent }}
                title={stream.color ?? undefined}
                aria-label={`Stream colour ${stream.color}`}
              />
            ) : (
              <span
                className="os-streams-detail-hero__color os-streams-detail-hero__color--muted"
                aria-hidden
              />
            )}
          </div>
          {stream.color?.trim() ? (
            <p className="os-streams-detail-hero__color-label">{stream.color.trim()}</p>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="os-streams-detail-hero__description">{description}</p>
      ) : null}
    </header>
  );
}
