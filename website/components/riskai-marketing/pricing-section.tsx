"use client";

import { Card, CardContent, CardTitle } from "@visualify/design-system";
import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  bodySecondaryClass,
  containerWideClass,
  linkPrimaryClass,
  linkSecondaryClass,
  marketingCardHoverClass,
  pricingTierHeaderClass,
  RISKAI_APP_URL,
  sectionAnchorOffsetClass,
  sectionHeadingClass,
  surfaceMutedBandClass,
} from "@/components/riskai-marketing/constants";

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={`border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] ${surfaceMutedBandClass} px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28 ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={`${containerWideClass} ${sectionAnchorOffsetClass}`}>
        <MarketingScrollRevealItem index={0}>
          <h2 id="pricing-heading" className={`${sectionHeadingClass} mx-auto text-center`}>
            Start with a real project, not a demo
          </h2>
          <p
            className={`mx-auto mt-5 max-w-[36rem] text-pretty text-center text-[length:var(--ds-text-base)] leading-relaxed sm:mt-4 ${bodySecondaryClass}`}
          >
            RiskAI is priced per project so you can model real decisions from day one.
          </p>
        </MarketingScrollRevealItem>
        <div className="mt-12 grid gap-5 md:mt-11 md:grid-cols-3 md:items-stretch md:gap-4 lg:gap-5">
          <MarketingScrollRevealItem index={1}>
            <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
              <CardContent className="flex flex-1 flex-col gap-4 px-5 py-7 sm:px-6">
                <div className={pricingTierHeaderClass}>
                  <CardTitle className="text-[length:var(--ds-text-base)] font-semibold leading-snug text-[var(--ds-text-primary)]">
                    Free
                  </CardTitle>
                </div>
                <ul
                  className={`grow list-disc space-y-1.5 pl-4 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                >
                  <li>1 Project</li>
                  <li>Basic simulation</li>
                  <li>Limited scenarios</li>
                </ul>
                <div className="mt-auto pt-1">
                  <a href={RISKAI_APP_URL} className={`${linkSecondaryClass} w-full justify-center`} rel="noopener noreferrer" target="_blank">
                    Try RiskAI
                  </a>
                </div>
              </CardContent>
            </Card>
          </MarketingScrollRevealItem>
          <MarketingScrollRevealItem index={2}>
            <Card
              variant="default"
              className={
                `${marketingCardHoverClass} flex h-full flex-col border border-[color-mix(in_oklab,var(--ds-primary)_45%,var(--ds-border-subtle))] ` +
                "bg-[color-mix(in_oklab,var(--ds-primary)_8%,var(--ds-surface))] shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--ds-primary)_22%,transparent)]"
              }
            >
              <CardContent className="flex flex-1 flex-col gap-4 px-5 py-8 sm:px-6">
                <div className={pricingTierHeaderClass}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_oklab,var(--ds-primary)_90%,var(--ds-text-muted))]">
                    Most teams start here
                  </p>
                  <CardTitle className="text-[length:var(--ds-text-lg)] font-semibold leading-snug text-[var(--ds-text-primary)]">
                    $400 / month / project
                  </CardTitle>
                </div>
                <ul
                  className={`grow list-disc space-y-1.5 pl-4 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                >
                  <li>Unlimited scenarios</li>
                  <li>AI-assisted analysis</li>
                  <li>Exposure and driver insights</li>
                  <li>Reporting and export</li>
                </ul>
                <div className="mt-auto pt-1">
                  <a href={RISKAI_APP_URL} className={`${linkPrimaryClass} w-full justify-center`} rel="noopener noreferrer" target="_blank">
                    Try RiskAI
                  </a>
                </div>
              </CardContent>
            </Card>
          </MarketingScrollRevealItem>
          <MarketingScrollRevealItem index={3}>
            <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
              <CardContent className="flex flex-1 flex-col gap-4 px-5 py-7 sm:px-6">
                <div className={pricingTierHeaderClass}>
                  <CardTitle className="text-[length:var(--ds-text-base)] font-semibold leading-snug text-[var(--ds-text-primary)]">
                    Enterprise
                  </CardTitle>
                </div>
                <ul
                  className={`grow list-disc space-y-1.5 pl-4 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                >
                  <li>Portfolio-level visibility</li>
                  <li>Cross-project analysis</li>
                  <li>Custom integrations</li>
                  <li>Dedicated support</li>
                </ul>
                <div className="mt-auto pt-1">
                  <a href="#contact" className={`${linkSecondaryClass} w-full justify-center`}>
                    Talk to us
                  </a>
                </div>
              </CardContent>
            </Card>
          </MarketingScrollRevealItem>
        </div>
        <MarketingScrollRevealItem index={4}>
          <p className="mt-10 text-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)] sm:mt-9">
            No per-user pricing. Cancel anytime.
          </p>
        </MarketingScrollRevealItem>
      </MarketingScrollRevealGroup>
    </section>
  );
}
