"use client";

import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  bodySecondaryClass,
  containerWideClass,
  sectionAnchorOffsetClass,
  sectionHeadingClass,
  sectionPadSpacing,
  surfaceMutedBandClass,
} from "@/components/riskai-marketing/constants";

export function ProblemSection() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-section-heading"
      className={`border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] ${surfaceMutedBandClass} ${sectionPadSpacing} ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={`${containerWideClass}`}>
        <MarketingScrollRevealItem index={0}>
          <h2 id="problem-section-heading" className={sectionHeadingClass}>
            Projects don’t fail on paper. They fail in uncertainty.
          </h2>
        </MarketingScrollRevealItem>
        <MarketingScrollRevealItem index={1}>
          <div className={`mt-6 max-w-[40rem] space-y-4 text-base leading-[1.7] sm:mt-5 sm:text-[length:var(--ds-text-base)] sm:leading-relaxed ${bodySecondaryClass}`}>
            <p>
              Risk isn’t missing — it’s poorly quantified, inconsistently assessed, and reviewed too late.
            </p>
            <p>
              Most teams rely on spreadsheets and static registers. These tools record risk, but they don’t explain its
              impact on cost and schedule.
            </p>
            <p>When decisions matter, teams are left without a clear view of exposure.</p>
          </div>
        </MarketingScrollRevealItem>
      </MarketingScrollRevealGroup>
    </section>
  );
}
