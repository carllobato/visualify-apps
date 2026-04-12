"use client";

import { ClosingSection } from "@/components/riskai-marketing/closing-section";
import { FeaturesSection } from "@/components/riskai-marketing/features-section";
import { HeroSection } from "@/components/riskai-marketing/hero-section";
import { HowItWorksSection } from "@/components/riskai-marketing/how-it-works-section";
import { MarketingFooter } from "@/components/riskai-marketing/marketing-footer";
import { MarketingHeader } from "@/components/riskai-marketing/marketing-header";
import { PricingSection } from "@/components/riskai-marketing/pricing-section";
import { ProblemSection } from "@/components/riskai-marketing/problem-section";
import { ShiftSection } from "@/components/riskai-marketing/shift-section";

/**
 * RiskAI marketing landing — hero → problem → shift → how it works → features → pricing → closing (CTA + enquiry).
 */
export default function RiskAiPage() {
  return (
    <>
      <MarketingHeader />
      <div className="relative z-10 flex min-h-[100svh] flex-col pt-[var(--ds-app-header-height)]">
        <main className="flex-1">
          <HeroSection />
          <ProblemSection />
          <ShiftSection />
          <HowItWorksSection />
          <FeaturesSection />
          <PricingSection />
          <ClosingSection />
        </main>
        <MarketingFooter />
      </div>
    </>
  );
}
