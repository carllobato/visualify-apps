import { MorningBriefVoice } from "@/components/today/MorningBriefVoice";
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
};

export function TodayBriefingHero({
  briefing,
  spokenBriefText = TODAY_MORNING_BRIEF_PLACEHOLDER,
  previewBody,
  previewRemainder,
  metaLine,
  title,
}: TodayBriefingHeroProps) {
  const hasWrittenBrief = briefing != null && (previewBody != null || metaLine != null);

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
        {metaLine ? (
          <p className="os-today-hero__meta text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
            {metaLine}
          </p>
        ) : !hasWrittenBrief ? (
          <p className="os-today-hero__meta text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            No written briefing yet.
          </p>
        ) : null}
      </div>

      {previewBody ? (
        <div className="flex flex-col gap-3">
          <p className="os-today-hero__body whitespace-pre-wrap break-words text-[length:var(--ds-text-base)] leading-relaxed text-[var(--ds-text-primary)]">
            {previewBody}
          </p>
          {previewRemainder ? (
            <details className="os-today-hero__more group">
              <summary className="cursor-pointer list-none text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span>Read full briefing</span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap break-words text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-text-primary)]">
                {previewRemainder}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
