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
  surfaceMutedBandClass,
} from "@/components/riskai-marketing/constants";

const steps = [
  {
    title: "Capture risks",
    body: "Upload or structure your risk register",
  },
  {
    title: "Model exposure",
    body: "AI and Monte Carlo simulation quantify cost and schedule impact",
  },
  {
    title: "Test decisions",
    body: "Run scenarios and compare outcomes",
  },
  {
    title: "Act with confidence",
    body: "Make decisions based on measurable exposure",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-riskai-works"
      aria-labelledby="how-riskai-works-heading"
      className={`border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] ${surfaceMutedBandClass} ${sectionPadSpacing} ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={containerWideClass}>
        <MarketingScrollRevealItem index={0}>
          <h2 id="how-riskai-works-heading" className={sectionHeadingClass}>
            How RiskAI works
          </h2>
        </MarketingScrollRevealItem>
        <div className="mt-12 grid gap-6 sm:mt-11 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {steps.map((step, i) => (
            <MarketingScrollRevealItem key={step.title} index={i + 1}>
              <Card variant="default" className={`${marketingCardHoverClass} h-full`}>
                <CardContent className="flex h-full flex-col gap-2.5 px-5 py-7 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-muted)]">
                    Step {i + 1}
                  </p>
                  <CardTitle className="!font-semibold text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
                    {step.title}
                  </CardTitle>
                  <p className={`mt-auto text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>{step.body}</p>
                </CardContent>
              </Card>
            </MarketingScrollRevealItem>
          ))}
        </div>
      </MarketingScrollRevealGroup>
    </section>
  );
}
