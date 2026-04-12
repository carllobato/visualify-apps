"use client";

import { ProductFrame } from "@/components/product-frame";
import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  AiAssistMockVisual,
  RegisterMockVisual,
  ReportingMockVisual,
} from "@/components/riskai-marketing/feature-visuals";
import {
  bodySecondaryClass,
  containerWideClass,
  sectionAnchorOffsetClass,
  sectionHeadingClass,
  sectionPadSpacing,
  surfacePageClass,
} from "@/components/riskai-marketing/constants";

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className={`border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] ${surfacePageClass} ${sectionPadSpacing} ${sectionAnchorOffsetClass}`}
    >
      <MarketingScrollRevealGroup className={containerWideClass}>
        <MarketingScrollRevealItem index={0}>
          <h2 id="features-heading" className={sectionHeadingClass}>
            Features
          </h2>
        </MarketingScrollRevealItem>

        {/* Structured Risk Register — abstract register mock */}
        <div className="mt-14 flex flex-col gap-16 sm:mt-12 lg:gap-[4.5rem]">
          <MarketingScrollRevealItem index={1}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl lg:max-w-[26rem]">
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)] sm:text-xl">
                  Structured Risk Register
                </h3>
                <p className={`mt-3 text-[length:var(--ds-text-base)] leading-relaxed ${bodySecondaryClass}`}>
                  Capture and standardise risks in a consistent format.
                </p>
              </div>
              <div className="min-w-0 justify-self-end lg:max-w-[28rem] lg:justify-self-end">
                <RegisterMockVisual />
              </div>
            </div>
          </MarketingScrollRevealItem>

          {/* Simulation — real distribution / chart crop (single use of preview asset) */}
          <MarketingScrollRevealItem index={2}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 max-w-xl lg:order-1 lg:max-w-[26rem]">
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)] sm:text-xl">
                  Cost &amp; Schedule Simulation
                </h3>
                <p className={`mt-3 text-[length:var(--ds-text-base)] leading-relaxed ${bodySecondaryClass}`}>
                  Quantify exposure using Monte Carlo simulation.
                </p>
              </div>
              <div className="order-1 min-w-0 lg:order-2 lg:justify-self-end">
                <ProductFrame
                  lightSrc="/images/riskai-preview-light.png"
                  darkSrc="/images/riskai-preview-dark.png"
                  alt="Monte Carlo cost and schedule distributions"
                  className="w-full max-w-xl lg:ml-auto lg:max-w-[30rem]"
                  sizes="(max-width: 1024px) 92vw, min(480px, 42vw)"
                  prominent
                  interactive={false}
                  imageContainerClassName="max-h-[17rem] overflow-hidden sm:max-h-[19rem]"
                  imageClassName="object-cover object-[50%_58%] scale-[1.08]"
                />
              </div>
            </div>
          </MarketingScrollRevealItem>

          {/* AI assist — panel mock */}
          <MarketingScrollRevealItem index={3}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl lg:max-w-[26rem]">
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)] sm:text-xl">
                  AI-Assisted Risk Input
                </h3>
                <p className={`mt-3 text-[length:var(--ds-text-base)] leading-relaxed ${bodySecondaryClass}`}>
                  Accelerate risk capture and improve consistency.
                </p>
              </div>
              <div className="min-w-0 justify-self-end lg:max-w-[28rem] lg:justify-self-end">
                <AiAssistMockVisual />
              </div>
            </div>
          </MarketingScrollRevealItem>

          {/* Reporting — KPI strip + cropped dashboard */}
          <MarketingScrollRevealItem index={4}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 max-w-xl space-y-6 lg:order-1 lg:max-w-[26rem]">
                <div>
                  <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--ds-text-primary)] sm:text-xl">
                    Clear Reporting Outputs
                  </h3>
                  <p className={`mt-3 text-[length:var(--ds-text-base)] leading-relaxed ${bodySecondaryClass}`}>
                    Understand drivers, exposure, and outcomes at a glance.
                  </p>
                </div>
                <ReportingMockVisual />
              </div>
              <div className="order-1 min-w-0 lg:order-2 lg:justify-self-end">
                <ProductFrame
                  lightSrc="/images/riskai-hero-1-light.png"
                  darkSrc="/images/riskai-hero-1-dark.png"
                  alt="Summary metrics and drivers in RiskAI"
                  className="w-full max-w-xl lg:ml-auto lg:max-w-[30rem]"
                  sizes="(max-width: 1024px) 92vw, min(480px, 42vw)"
                  prominent
                  interactive={false}
                  showWindowChrome={false}
                  imageContainerClassName="max-h-[14rem] overflow-hidden sm:max-h-[15rem]"
                  imageClassName="object-cover object-[50%_18%] scale-[1.12]"
                />
              </div>
            </div>
          </MarketingScrollRevealItem>
        </div>
      </MarketingScrollRevealGroup>
    </section>
  );
}
