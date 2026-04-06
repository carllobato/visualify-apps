"use client";

import Link from "next/link";
import { Card, CardContent, CardTitle } from "@visualify/design-system";
import { MarketingContactSection } from "@/components/marketing-contact-section";
import { ProductFrame } from "@/components/product-frame";

const riskaiAppOrigin = (
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_RISKAI_APP_ORIGIN?.trim()) ||
  "https://app.visualify.com.au"
).replace(/\/+$/, "");

const RISKAI_APP_URL = riskaiAppOrigin;
const RISKAI_LOGIN_URL = `${riskaiAppOrigin}/login`;

/** Softer than raw `--ds-text-secondary` for long body copy (token-based mix). */
const bodySecondaryClass =
  "text-[color-mix(in_oklab,var(--ds-text-secondary)_86%,var(--ds-text-primary))]";

const linkPrimaryClass =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-5 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] transition-all duration-150 ease-out " +
  "bg-[var(--ds-primary)] hover:bg-[var(--ds-primary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

const linkSecondaryClass =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-5 text-[length:var(--ds-text-base)] font-medium transition-all duration-150 ease-out " +
  "border-0 bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-button-secondary)] " +
  "hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

/** Matches design-system `Button` secondary `md` — aligned with RiskAI TopNav chrome. */
const headerSignInClass =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out " +
  "border-0 bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-elevation-button-secondary)] " +
  "hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-button-secondary-hover)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

/** Marketing stat / step tiles — lift + stronger elevation on hover (respects reduced motion). */
const marketingCardHoverClass =
  "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:bg-[var(--ds-surface-hover)] hover:shadow-[var(--ds-elevation-tile-hover)] " +
  "hover:border-[color-mix(in_oklab,var(--ds-border-subtle)_65%,transparent)] " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[var(--ds-elevation-tile)] " +
  "motion-reduce:hover:bg-[var(--ds-surface)] motion-reduce:hover:border-transparent";

/** Hero perspective shells — lift + deepen outer drop shadow (frame inside stays static; avoids double translate). */
const heroFanShellHoverClass =
  "cursor-default transition-[transform,box-shadow] duration-200 ease-out " +
  "hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** Clears fixed header when jumping to #anchors. */
const sectionAnchorOffsetClass = "scroll-mt-[var(--ds-app-header-height)]";

/** Equal-height title blocks so feature lists start on the same baseline across pricing tiers. */
const pricingTierHeaderClass =
  "mb-0 flex min-h-[6.25rem] flex-col gap-2 sm:min-h-[6rem] lg:min-h-[5.5rem] [&_h3]:mb-0 [&_p]:mb-0";

/** Hero wash + document-tile gradient — matches `#riskai-in-action` (light marketing only). */
function MarketingSectionPhotoBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/hero-light.jpg')] bg-cover bg-center bg-no-repeat dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[color-mix(in_oklab,var(--ds-document-tile-bg)_94%,transparent)] via-[color-mix(in_oklab,var(--ds-document-tile-bg)_62%,transparent)] to-[color-mix(in_oklab,var(--ds-document-tile-bg)_22%,transparent)] dark:hidden"
      />
    </>
  );
}

export function HomeMarketing() {
  const sectionPadSpacing = "px-4 py-24 sm:px-6 sm:py-28 lg:px-10 lg:py-32";

  return (
    <>
      <header
        className={
          "ds-app-top-nav flex h-14 shrink-0 items-center justify-between gap-[var(--ds-space-3)] " +
          "pl-[var(--ds-space-2)] pr-0 md:pr-[var(--ds-space-3)]"
        }
      >
        <div className="flex min-w-0 items-center gap-[var(--ds-space-3)]">
          <Link
            href="/"
            className="inline-flex h-9 items-center px-[var(--ds-space-2)] text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight text-[var(--ds-text-primary)] no-underline transition-colors hover:text-[var(--ds-text-secondary)]"
          >
            Visualify <span className="mx-1.5 font-normal">|</span> RiskAI
          </Link>
        </div>
        <div className="flex items-center gap-[var(--ds-space-2)]">
          <a
            href={RISKAI_LOGIN_URL}
            className={headerSignInClass}
            rel="noopener noreferrer"
            target="_blank"
          >
            Sign in
          </a>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[100svh] flex-col pt-[var(--ds-app-header-height)]">
        <main className="flex-1">
          {/* Hero */}
          <section
            id="hero-section"
            aria-labelledby="hero-section-heading"
            className={`box-border flex max-h-[80svh] flex-col overflow-x-clip overflow-y-hidden bg-[var(--ds-app-document-bg)] px-4 py-20 sm:px-6 sm:py-24 lg:h-[80svh] lg:min-h-0 lg:max-h-[80svh] lg:overflow-x-visible lg:pl-10 lg:pr-10 lg:py-28 xl:pr-12 ${sectionAnchorOffsetClass}`}
          >
            <div className="mx-auto grid min-h-0 w-full max-w-[90%] flex-1 gap-8 overflow-hidden lg:overflow-visible lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-8 xl:gap-10">
              <div className="flex min-h-0 max-w-lg min-w-0 flex-col lg:max-w-[24rem] lg:justify-self-start">
                <h1
                  id="hero-section-heading"
                  className="text-pretty text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--ds-text-primary)] sm:text-[2.75rem] sm:leading-[1.06] lg:text-[3.05rem] lg:leading-[1.06]"
                >
                  Turn risk into decision.
                </h1>
                <p
                  className={`mt-8 max-w-[38ch] text-pretty text-lg font-medium leading-[1.65] sm:text-xl sm:leading-[1.6] ${bodySecondaryClass}`}
                >
                  AI and Monte Carlo simulation turn project risk into clear, measurable cost and schedule
                  exposure.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <a href="#section-6" className={`${linkPrimaryClass} w-full justify-center sm:w-auto`}>
                    Try RiskAI
                  </a>
                  <a
                    href="#riskai-in-action"
                    className={`${linkSecondaryClass} w-full justify-center sm:w-auto`}
                  >
                    See how it works
                  </a>
                </div>
              </div>
              {/* Hero product composition — layered on desktop, single on mobile */}
              <div className="relative flex h-full min-h-0 w-full min-w-0 max-h-full max-w-full flex-col justify-center justify-self-stretch overflow-hidden lg:h-auto lg:max-h-none lg:justify-center lg:overflow-visible">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 lg:hidden"
                  style={{
                    background:
                      "radial-gradient(ellipse 118% 92% at 50% 40%, color-mix(in oklab, var(--ds-text-primary) 2.2%, transparent) 0%, color-mix(in oklab, var(--ds-text-primary) 0.45%, transparent) 46%, transparent 64%)",
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
                  style={{
                    background:
                      "radial-gradient(ellipse 96% 86% at 50% 50%, color-mix(in oklab, var(--ds-text-primary) 2%, transparent) 0%, color-mix(in oklab, var(--ds-text-primary) 0.35%, transparent) 44%, transparent 66%)",
                  }}
                />
                {/* Mobile / tablet: single crisp image */}
                <div className="relative z-[1] max-h-[min(52svh,100%)] w-full min-h-0 overflow-hidden lg:hidden">
                  <ProductFrame
                    lightSrc="/images/riskai-hero-1-light.png"
                    darkSrc="/images/riskai-hero-1-dark.png"
                    alt="RiskAI product interface showing project risk overview"
                    className="w-full max-w-full"
                    sizes="(max-width: 1023px) 90vw, min(960px, 50vw)"
                    priority
                    interactive
                  />
                </div>

                {/* Desktop: 3-layer perspective fan — overflow visible at lg so shadows are not clipped */}
                <div className="relative z-[1] hidden min-h-0 w-full min-w-0 max-w-full overflow-hidden lg:flex lg:h-auto lg:max-h-none lg:flex-col lg:items-center lg:justify-center lg:overflow-visible lg:px-2">
                  <div
                    className="relative max-h-full min-h-0 w-full max-w-[min(100%,52rem)] shrink-0 overflow-hidden lg:mx-auto lg:overflow-visible"
                    style={{ perspective: "1600px", perspectiveOrigin: "50% 50%" }}
                  >
                  {/* Layer 3 — back (furthest left, most skewed) */}
                  <div
                    className="absolute top-0 right-0 left-0 z-[1]"
                    style={{
                      transform: "translateX(-22%) rotateY(42deg) scale(0.42)",
                      transformOrigin: "center center",
                    }}
                  >
                    <div
                      className={`relative rounded-[var(--ds-radius-md)] shadow-[0_8px_30px_rgba(0,0,0,0.14)] hover:!shadow-[0_11px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.05)] dark:hover:!shadow-[0_10px_38px_rgba(255,255,255,0.08)] ${heroFanShellHoverClass}`}
                    >
                      <ProductFrame
                        lightSrc="/images/riskai-hero-3-light.png"
                        darkSrc="/images/riskai-hero-3-dark.png"
                        alt="RiskAI analytics view"
                        className="w-full max-w-full"
                        sizes="min(960px, 50vw)"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-canvas)]/45" />
                    </div>
                  </div>

                  {/* Layer 2 — middle */}
                  <div
                    className="absolute top-0 right-0 left-0 z-[2]"
                    style={{
                      transform: "translateX(-4%) rotateY(34deg) scale(0.48)",
                      transformOrigin: "center center",
                    }}
                  >
                    <div
                      className={`relative rounded-[var(--ds-radius-md)] shadow-[0_14px_40px_rgba(0,0,0,0.16)] hover:!shadow-[0_17px_46px_rgba(0,0,0,0.2)] dark:shadow-[0_14px_40px_rgba(255,255,255,0.05)] dark:hover:!shadow-[0_16px_48px_rgba(255,255,255,0.07)] ${heroFanShellHoverClass}`}
                    >
                      <ProductFrame
                        lightSrc="/images/riskai-hero-2-light.png"
                        darkSrc="/images/riskai-hero-2-dark.png"
                        alt="RiskAI simulation dashboard"
                        className="w-full max-w-full"
                        sizes="min(960px, 50vw)"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-canvas)]/35" />
                    </div>
                  </div>

                  {/* Layer 1 — front (in-flow, defines container height) */}
                  <div
                    className="relative z-[3]"
                    style={{
                      transform: "translateX(20%) rotateY(12deg) scale(0.56)",
                      transformOrigin: "center center",
                    }}
                  >
                    <div
                      className={`rounded-[var(--ds-radius-md)] shadow-[0_24px_56px_rgba(0,0,0,0.22)] hover:!shadow-[0_28px_62px_rgba(0,0,0,0.26)] dark:shadow-[0_24px_56px_rgba(255,255,255,0.05)] dark:hover:!shadow-[0_26px_64px_rgba(255,255,255,0.08)] ${heroFanShellHoverClass}`}
                    >
                      <ProductFrame
                        lightSrc="/images/riskai-hero-1-light.png"
                        darkSrc="/images/riskai-hero-1-dark.png"
                        alt="RiskAI product interface showing project risk overview"
                        className="w-full max-w-full"
                        sizes="min(960px, 50vw)"
                        priority
                      />
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1 — Problem */}
          <section
            id="riskai-in-action"
            aria-labelledby="section-1-heading"
            className={`relative ${sectionPadSpacing} ${sectionAnchorOffsetClass} bg-[var(--ds-document-tile-bg)]`}
          >
            <MarketingSectionPhotoBackdrop />
            <div className="relative z-[1] mx-auto max-w-2xl">
              <h2 id="section-1-heading" className="ds-heading-2">
                Projects don’t fail on paper. They fail in uncertainty.
              </h2>
              <div className={`mt-8 space-y-5 text-base leading-[1.7] sm:text-lg sm:leading-[1.65] ${bodySecondaryClass}`}>
                <p>
                  Risk isn’t missing. It’s misunderstood, poorly quantified, or reviewed too late.
                </p>
                <p>
                  Most teams rely on static registers, subjective scoring, and disconnected data. These approaches
                  record risk, but they don’t explain its impact.
                </p>
                <p>
                  When decisions matter, around funding, sequencing, or mitigation, teams are left without a clear view
                  of cost and schedule exposure.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 — What RiskAI enables */}
          <section id="section-2" aria-labelledby="section-2-heading" className={`${sectionPadSpacing} ${sectionAnchorOffsetClass}`}>
            <div className="mx-auto max-w-6xl">
              <h2 id="section-2-heading" className="ds-heading-2">
                What RiskAI enables
              </h2>
              <div className="mt-14 grid gap-8 md:grid-cols-3">
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Quantify real exposure
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Turn risk registers into measurable cost and schedule impact.
                    </p>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Understand probability, range, and downside. Not just high, medium, low.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Focus on what drives outcomes
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      See which risks actually move cost and schedule.
                    </p>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Cut through noise and prioritise what matters to the outcome.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Test decisions before you commit
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Run scenarios, compare mitigation strategies, and understand trade-offs before locking decisions
                      into delivery.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How RiskAI works */}
          <section
            id="how-riskai-works"
            aria-labelledby="how-riskai-works-heading"
            className={`relative ${sectionPadSpacing} ${sectionAnchorOffsetClass} bg-[var(--ds-document-tile-bg)]`}
          >
            <MarketingSectionPhotoBackdrop />
            <div className="relative z-[1] mx-auto max-w-6xl">
              <p
                className={`mb-2 max-w-2xl text-pretty text-sm font-normal leading-relaxed text-[var(--ds-text-muted)] sm:mb-2.5 sm:text-[length:var(--ds-text-base)] sm:leading-snug`}
              >
                Built for real project delivery, not theoretical models.
              </p>
              <h2 id="how-riskai-works-heading" className="ds-heading-2">
                How RiskAI works
              </h2>
              <p
                className={`mt-6 max-w-3xl text-base leading-[1.7] sm:text-lg sm:leading-[1.65] ${bodySecondaryClass}`}
              >
                RiskAI turns risk data into measurable cost and schedule exposure so teams can test decisions before
                committing.
              </p>
              <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-3 px-6 py-8">
                    <CardTitle className="!font-medium text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
                      Input data
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Upload your risk register or connect project data to create a clear starting point.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-3 px-6 py-8">
                    <CardTitle className="!font-medium text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
                      Model exposure
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      AI and Monte Carlo simulation quantify cost and schedule impact across your project.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-3 px-6 py-8">
                    <CardTitle className="!font-medium text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
                      Test decisions
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Run scenarios, compare mitigation strategies, and see what actually changes the outcome.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-3 px-6 py-8">
                    <CardTitle className="!font-medium text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-primary)]">
                      Act with confidence
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Make decisions based on measurable exposure, not assumptions or static scoring.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Product preview */}
          <section
            id="section-3"
            aria-labelledby="riskai-preview-heading"
            className={`${sectionPadSpacing} ${sectionAnchorOffsetClass}`}
          >
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
                <div className="flex max-w-[min(100%,32rem)] flex-col justify-center gap-7 lg:col-start-2 lg:row-start-1">
                  <h2 id="riskai-preview-heading" className="ds-heading-2">
                    Test your mitigations
                  </h2>
                  <p
                    className={`text-base leading-[1.7] sm:text-lg sm:leading-[1.65] ${bodySecondaryClass}`}
                  >
                    Powered by AI and Monte Carlo simulation, RiskAI models your project to quantify cost and schedule
                    exposure. See what drives outcomes, test mitigation strategies, and understand trade-offs before
                    decisions are locked in.
                  </p>
                  <div>
                    <a href="#section-6" className={linkPrimaryClass}>
                      Try RiskAI
                    </a>
                  </div>
                </div>
                <ProductFrame
                  lightSrc="/images/riskai-preview-light.png"
                  darkSrc="/images/riskai-preview-dark.png"
                  alt="RiskAI simulation and driver analysis"
                  className="min-h-[280px] w-full lg:col-start-1 lg:row-start-1 lg:min-h-[360px]"
                  prominent
                  interactive
                />
              </div>
            </div>
          </section>

          {/* Section 5 — Audience */}
          <section
            id="section-5"
            aria-labelledby="section-5-heading"
            className={`relative ${sectionPadSpacing} ${sectionAnchorOffsetClass} bg-[var(--ds-document-tile-bg)]`}
          >
            <MarketingSectionPhotoBackdrop />
            <div className="relative z-[1] mx-auto max-w-6xl">
              <h2 id="section-5-heading" className="ds-heading-2">
                Built for the teams making the call
              </h2>
              <div className="mt-14 grid gap-8 md:grid-cols-3 md:items-stretch">
                <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
                  <CardContent className="flex flex-1 flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Owners & Investors
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Understand cost and schedule exposure before committing capital. Make investment decisions with a
                      clear view of risk, return, and downside.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
                  <CardContent className="flex flex-1 flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Developers & Builders
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Test scenarios, plan mitigation, and manage delivery risk with a clear view of what drives cost and
                      schedule outcomes.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
                  <CardContent className="flex flex-1 flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Project Teams & Consultants
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Move beyond static risk registers. Quantify exposure, align stakeholders, and provide a defensible
                      basis for decisions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Why RiskAI */}
          <section id="why-riskai" aria-labelledby="why-riskai-heading" className={`${sectionPadSpacing} ${sectionAnchorOffsetClass}`}>
            <div className="mx-auto max-w-6xl">
              <h2 id="why-riskai-heading" className="ds-heading-2">
                Why RiskAI
              </h2>
              <div className="mt-14 grid gap-8 md:grid-cols-3">
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Built for real projects
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Designed for delivery teams, not academic models. RiskAI reflects how projects actually run, with
                      real constraints, real data, and real decisions.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      Decision-first, not reporting-first
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Most tools report risk. RiskAI shows what it means, what drives it, and what to do about it before
                      decisions are locked in.
                    </p>
                  </CardContent>
                </Card>
                <Card variant="default" className={marketingCardHoverClass}>
                  <CardContent className="flex flex-col gap-4 px-6 py-8">
                    <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                      From risk register to exposure model
                    </CardTitle>
                    <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                      Turn static risk data into quantified cost and schedule impact. Move from subjective scoring to
                      measurable outcomes.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Pricing & final CTA */}
          <section
            id="section-6"
            aria-labelledby="section-6-heading"
            className={
              `relative px-4 pt-24 pb-28 sm:px-6 sm:pt-28 sm:pb-32 lg:px-10 lg:pt-32 lg:pb-40 ` +
              `${sectionAnchorOffsetClass} bg-[var(--ds-document-tile-bg)]`
            }
          >
            <MarketingSectionPhotoBackdrop />
            <div id="pricing" className={`relative z-[1] mx-auto max-w-6xl ${sectionAnchorOffsetClass}`}>
              <h2 id="section-6-heading" className="ds-heading-2 mx-auto max-w-2xl text-center">
                Start with a real project, not a demo.
              </h2>
              <p
                className={`mx-auto mt-6 max-w-2xl text-pretty text-center text-base leading-[1.7] sm:text-lg sm:leading-[1.65] ${bodySecondaryClass}`}
              >
                RiskAI is priced per project, so you can model real decisions from day one.
              </p>
              <div className="mt-14 grid gap-8 overflow-visible pt-2 pb-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)_minmax(0,1fr)] md:items-stretch md:gap-6 lg:gap-8">
                <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
                  <CardContent className="flex flex-1 flex-col gap-3 px-6 py-8">
                    <div className={pricingTierHeaderClass}>
                      <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                        Free
                      </CardTitle>
                      <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                        Explore RiskAI with a single project.
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-5">
                      <ul
                        className={`grow list-disc space-y-2 pl-5 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                      >
                        <li>1 Project</li>
                        <li>Basic simulation</li>
                        <li>Mitigation strategy</li>
                        <li>No AI features</li>
                        <li>Limited scenarios</li>
                      </ul>
                      <div className="mt-auto pt-2">
                        <a
                          href={RISKAI_APP_URL}
                          className={linkSecondaryClass}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Try RiskAI
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  variant="default"
                  className={
                    `${marketingCardHoverClass} relative z-10 flex h-full flex-col border-2 border-[var(--ds-primary)] ` +
                    "bg-[color-mix(in_oklab,var(--ds-primary)_12%,var(--ds-surface))] shadow-[var(--ds-shadow-lg)] " +
                    "md:-translate-y-1.5 motion-reduce:md:translate-y-0 " +
                    "hover:!border-[var(--ds-primary)]"
                  }
                >
                  <CardContent className="flex flex-1 flex-col gap-3 px-6 py-9 sm:px-7 sm:py-10">
                    <div className={pricingTierHeaderClass}>
                      <CardTitle className="text-[length:var(--ds-text-lg)] font-semibold leading-snug text-[var(--ds-text-primary)] sm:text-xl sm:leading-snug">
                        $400 / month / project
                      </CardTitle>
                      <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                        Start with a full-featured project, free for your first month.
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-5">
                      <ul
                        className={`grow list-disc space-y-2 pl-5 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                      >
                        <li>Unlimited scenarios</li>
                        <li>AI-assisted risk analysis</li>
                        <li>Driver and exposure insights</li>
                        <li>Export and reporting</li>
                        <li>Portfolio reporting</li>
                      </ul>
                      <div className="mt-auto pt-2">
                        <a
                          href={RISKAI_APP_URL}
                          className={linkPrimaryClass}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Start your project
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="default" className={`${marketingCardHoverClass} flex h-full flex-col`}>
                  <CardContent className="flex flex-1 flex-col gap-3 px-6 py-8">
                    <div className={pricingTierHeaderClass}>
                      <CardTitle className="text-[length:var(--ds-text-base)] leading-snug text-[var(--ds-text-primary)]">
                        Portfolio & enterprise
                      </CardTitle>
                      <p className={`text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}>
                        Portfolio-level visibility across multiple projects.
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-5">
                      <ul
                        className={`grow list-disc space-y-2 pl-5 text-left text-[length:var(--ds-text-sm)] leading-relaxed ${bodySecondaryClass}`}
                      >
                        <li>Cross-project exposure</li>
                        <li>Portfolio dashboards</li>
                        <li>Custom integrations</li>
                        <li>Dedicated support</li>
                      </ul>
                      <div className="mt-auto pt-2">
                        <a href="#contact" className={linkSecondaryClass}>
                          Talk to us
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <p className="mt-10 text-center text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                No per-user pricing. No hidden costs. Cancel anytime.
              </p>
              <div className="mx-auto mt-16 flex max-w-2xl flex-col items-stretch justify-center sm:flex-row sm:justify-center">
                <a
                  href={RISKAI_APP_URL}
                  className={`${linkPrimaryClass} w-full justify-center sm:w-auto`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Try RiskAI with your project
                </a>
              </div>
            </div>
          </section>

          <MarketingContactSection />
        </main>

        <footer className="bg-[var(--ds-charcoal)] px-4 py-2 text-center sm:px-6 sm:py-2.5 lg:px-8">
          <p className="text-[length:var(--ds-text-xs)] leading-normal text-[color-mix(in_oklab,var(--ds-text-inverse)_58%,var(--ds-charcoal))]">
            © 2026 Visualify. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
