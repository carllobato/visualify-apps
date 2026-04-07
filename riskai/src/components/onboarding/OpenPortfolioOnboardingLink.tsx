"use client";

import type { MouseEvent, ReactNode } from "react";
import { OPEN_PORTFOLIO_ONBOARDING_EVENT } from "@/lib/onboarding/types";
import { riskaiPath } from "@/lib/routes";

type Props = {
  className: string;
  children: ReactNode;
};

/**
 * Same href as the legacy onboarding route (new tab / shareable), but a normal click opens the
 * shell modal without navigating.
 */
export function OpenPortfolioOnboardingLink({ className, children }: Props) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.dispatchEvent(new Event(OPEN_PORTFOLIO_ONBOARDING_EVENT));
  }

  return (
    <a href={riskaiPath("/onboarding/portfolio")} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
