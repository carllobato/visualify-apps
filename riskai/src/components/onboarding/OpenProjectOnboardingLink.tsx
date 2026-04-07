"use client";

import type { MouseEvent, ReactNode } from "react";
import { OPEN_PROJECT_ONBOARDING_EVENT } from "@/lib/onboarding/types";
import { riskaiPath } from "@/lib/routes";

type Props = {
  className: string;
  children: ReactNode;
  portfolioId?: string | null;
};

type OpenProjectOnboardingDetail = {
  portfolioId?: string;
};

export function dispatchOpenProjectOnboarding(portfolioId?: string | null) {
  const detail: OpenProjectOnboardingDetail = {};
  if (portfolioId && portfolioId.trim()) detail.portfolioId = portfolioId.trim();
  window.dispatchEvent(new CustomEvent<OpenProjectOnboardingDetail>(OPEN_PROJECT_ONBOARDING_EVENT, { detail }));
}

/**
 * Same href as legacy create-project route, but normal click opens shell modal without navigation.
 */
export function OpenProjectOnboardingLink({ className, children, portfolioId = null }: Props) {
  const href =
    portfolioId && portfolioId.trim()
      ? `${riskaiPath("/create-project")}?portfolioId=${encodeURIComponent(portfolioId)}`
      : riskaiPath("/create-project");

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    dispatchOpenProjectOnboarding(portfolioId);
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
