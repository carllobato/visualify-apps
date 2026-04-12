"use client";

import { Card, CardContent, CardTitle } from "@visualify/design-system";
import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  bodySecondaryClass,
  containerWideClass,
  marketingCardHoverClass,
  sectionAnchorOffsetClass,
  sectionHeadingClass,
  sectionPadSpacing,
  surfacePageClass,
} from "@/components/riskai-marketing/constants";

const blocks = [
  {
    title: "Quantify exposure",
    body:
      "Turn risks into measurable cost and schedule impact — not high, medium, low.",
  },
  {
    title: "See what matters",
    body: "Identify which risks actually drive outcomes and prioritise accordingly.",
  },
  {
    title: "Test before committing",
    body: "Compare mitigation strategies and understand trade-offs before locking decisions into delivery.",
  },
] as const;

export function ShiftSection() {
  return (
    <section
      id="shift"
      aria-labelledby="shift-section-heading"
      className={`${surfacePageClass} ${sectionPadSpacing} ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={containerWideClass}>
        <MarketingScrollRevealItem index={0}>
          <h2 id="shift-section-heading" className={sectionHeadingClass}>
            From risk registers to decision-making
          </h2>
        </MarketingScrollRevealItem>
        <div className="mt-12 grid gap-6 sm:mt-11 md:grid-cols-3 md:gap-5">
          {blocks.map((b, i) => (
            <MarketingScrollRevealItem key={b.title} index={i + 1}>
              <Card variant="default" className={`${marketingCardHoverClass} h-full`}>
                <CardContent className="flex h-full flex-col gap-2.5 px-5 py-7 sm:px-6">
                  <CardTitle className="text-[length:var(--ds-text-base)] font-semibold leading-snug text-[var(--ds-text-primary)]">
                    {b.title}
                  </CardTitle>
                  <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>{b.body}</p>
                </CardContent>
              </Card>
            </MarketingScrollRevealItem>
          ))}
        </div>
      </MarketingScrollRevealGroup>
    </section>
  );
}
