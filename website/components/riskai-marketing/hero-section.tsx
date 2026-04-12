"use client";

import { ProductFrame } from "@/components/product-frame";
import {
  MarketingScrollRevealGroup,
  MarketingScrollRevealItem,
} from "@/components/marketing-scroll-reveal";
import {
  bodySecondaryClass,
  linkPrimaryClass,
  linkSecondaryClass,
  RISKAI_APP_URL,
  sectionAnchorOffsetClass,
  surfaceMutedBandClass,
  surfacePageClass,
} from "@/components/riskai-marketing/constants";

function FloatingStatCard({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div
      className={
        `pointer-events-none max-w-[11.5rem] rounded-[var(--ds-radius-sm)] border border-[color-mix(in_oklab,var(--ds-border-subtle)_82%,transparent)] ` +
        `bg-[color-mix(in_oklab,var(--ds-text-inverse)_94%,var(--ds-surface))] px-3.5 py-3 shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--ds-scrim-ink)_22%,transparent)] backdrop-blur-sm ` +
        className
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ds-text-muted)]">{title}</p>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-[color-mix(in_oklab,var(--ds-border-subtle)_55%,transparent)] pt-2.5">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--ds-text-muted)]">P50</p>
          <p className="text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]">—</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--ds-text-muted)]">P80</p>
          <p className="text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]">—</p>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section id="hero-section" aria-labelledby="hero-section-heading" className={`relative overflow-x-clip ${surfacePageClass} ${sectionAnchorOffsetClass}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${surfaceMutedBandClass} opacity-[0.55]`} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_100%_15%,color-mix(in_oklab,var(--ds-primary)_10%,transparent)_0%,transparent_55%)]"
      />
      <MarketingScrollRevealGroup
        className={
          "relative mx-auto grid max-w-6xl min-h-0 gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-16 lg:min-h-[min(100%,560px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-center lg:gap-12 lg:px-10 lg:pb-28 lg:pt-12 xl:gap-14"
        }
      >
        <MarketingScrollRevealItem index={0} className="flex max-w-[26rem] flex-col lg:max-w-none">
          <h1
            id="hero-section-heading"
            className="text-balance text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--ds-text-primary)] sm:text-[1.95rem] lg:text-[2.125rem] lg:leading-[1.18]"
          >
            <span className="block">Understand risk before it impacts</span>
            <span className="block">cost and schedule</span>
          </h1>
          <p
            className={`mt-5 max-w-[40ch] text-pretty text-[length:var(--ds-text-base)] font-normal leading-relaxed sm:mt-4 lg:text-[1.05rem] lg:leading-[1.55] ${bodySecondaryClass}`}
          >
            Structure risks, quantify impact, and understand how they affect cost and schedule before they become real
            problems.
          </p>
          <ul
            className={`mt-4 max-w-[40ch] list-none space-y-2 pl-0 text-[length:var(--ds-text-sm)] leading-relaxed sm:mt-3.5 ${bodySecondaryClass}`}
          >
            {[
              "Move beyond static risk registers",
              "Quantify cost and schedule exposure (P50 / P80)",
              "Test mitigation strategies before committing",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[color-mix(in_oklab,var(--ds-primary)_70%,var(--ds-text-muted))]"
                  aria-hidden
                />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <a
              href={RISKAI_APP_URL}
              className={`${linkPrimaryClass} w-full justify-center sm:w-auto`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Try RiskAI
            </a>
            <a href="#features" className={`${linkSecondaryClass} w-full justify-center sm:w-auto`}>
              View Product Overview
            </a>
          </div>
          <p className={`mt-2.5 text-[length:var(--ds-text-sm)] leading-snug sm:mt-2 ${bodySecondaryClass}`}>
            Sign up to access a preloaded demo project
          </p>
        </MarketingScrollRevealItem>

        <MarketingScrollRevealItem index={1} className="relative min-w-0">
          <div
            className={
              "relative mx-auto w-full max-w-[640px] rounded-[1.25rem] border border-[color-mix(in_oklab,var(--ds-border-subtle)_65%,transparent)] " +
              "bg-[color-mix(in_oklab,var(--ds-surface-muted)_22%,var(--ds-surface))] p-2 shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--ds-scrim-ink)_16%,transparent)] " +
              "ring-1 ring-[color-mix(in_oklab,var(--ds-text-primary)_5%,transparent)] lg:mx-0 lg:max-w-none"
            }
          >
            <div className="relative">
              <FloatingStatCard title="P50 / P80 · Cost exposure" className="absolute -top-1 left-3 z-20 sm:left-5 sm:top-2" />
              <FloatingStatCard title="P50 / P80 · Schedule exposure" className="absolute -bottom-1 right-3 z-20 sm:bottom-2 sm:right-5" />
              <ProductFrame
                lightSrc="/images/riskai-hero-1-light.png"
                darkSrc="/images/riskai-hero-1-dark.png"
                alt="RiskAI project overview with quantified exposure"
                className="w-full"
                sizes="(max-width: 1023px) 92vw, min(720px, 52vw)"
                priority
                prominent
                interactive={false}
                showWindowChrome={false}
              />
            </div>
          </div>
        </MarketingScrollRevealItem>
      </MarketingScrollRevealGroup>
    </section>
  );
}
