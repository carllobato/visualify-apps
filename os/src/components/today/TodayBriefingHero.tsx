import { MorningBriefVoice } from "@/components/today/MorningBriefVoice";
import { TodayWeatherChip } from "@/components/today/TodayWeatherChip";
import type { TodayBriefing } from "@/lib/today-data";
import { TODAY_MORNING_BRIEF_PLACEHOLDER } from "@/lib/today-morning-brief";

export type TodayBriefingHeroProps = {
  briefing: TodayBriefing | null;
  /** Text read aloud — hidden in the UI until AI/server wiring. */
  spokenBriefText?: string;
  previewBody: string | null;
  previewRemainder: string | null;
  metaLine: string | null;
  title: string;
  focusItems: string[];
  blockerSummary: string | null;
};

export function TodayBriefingHero({
  briefing,
  spokenBriefText = TODAY_MORNING_BRIEF_PLACEHOLDER,
  previewBody,
  previewRemainder,
  metaLine,
  title,
  focusItems,
  blockerSummary,
}: TodayBriefingHeroProps) {
  const hasSavedBriefExcerpt = briefing != null && (previewBody != null || previewRemainder != null);

  return (
    <article className="os-today-hero os-today-card flex flex-col gap-3 sm:gap-4">
      <div className="os-today-hero__header flex flex-col gap-1.5 sm:gap-2">
        <p className="os-today-hero__eyebrow text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)] max-md:sr-only">
          Daily briefing
        </p>
        <div className="os-today-hero__title-row flex items-center justify-between gap-3">
          <h2 className="os-today-hero__title min-w-0 flex-1 break-words text-[length:var(--ds-text-xl)] font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)]">
            {title}
          </h2>
          <MorningBriefVoice text={spokenBriefText} className="shrink-0" />
        </div>
        <div className="os-today-hero__meta-row flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {metaLine ? (
            <p className="os-today-hero__meta text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
              {metaLine}
            </p>
          ) : null}
          <TodayWeatherChip />
        </div>
      </div>

      <div className="os-today-hero__ops flex flex-col gap-2.5">
        <div className="os-today-hero__section">
          <p className="os-today-hero__section-label text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-muted)]">
            Focus
          </p>
          <ul className="os-today-hero__list">
            {focusItems.map((item) => (
              <li key={item} className="os-today-hero__list-item text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {blockerSummary ? (
          <p className="os-today-hero__blocker text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {blockerSummary}
          </p>
        ) : null}

        {hasSavedBriefExcerpt ? (
          <details className="os-today-hero__saved-note group">
            <summary className="cursor-pointer list-none text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] marker:content-none [&::-webkit-details-marker]:hidden">
              Saved note
            </summary>
            {previewBody ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-secondary)]">
                {previewBody}
                {previewRemainder ? " ..." : ""}
              </p>
            ) : null}
          </details>
        ) : null}
      </div>
    </article>
  );
}
