"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  OPEN_PROJECT_ONBOARDING_EVENT,
  type OpenProjectOnboardingDetail,
} from "@/lib/onboarding/types";
import {
  openProjectOnboardingDetail,
  projectOnboardingHref,
} from "@/lib/project/resolveWorkspaceProjectCreateParent";

type Props = {
  className: string;
  children: ReactNode;
  workspaceId?: string | null;
};

export function dispatchOpenProjectOnboarding(detail?: {
  workspaceId?: string | null;
}) {
  const eventDetail: OpenProjectOnboardingDetail = openProjectOnboardingDetail(detail ?? {});
  window.dispatchEvent(
    new CustomEvent<OpenProjectOnboardingDetail>(OPEN_PROJECT_ONBOARDING_EVENT, { detail: eventDetail }),
  );
}

/**
 * Same href as create-project route, but normal click opens shell modal without navigation.
 * `workspaceId` is the required parent from Workspace surfaces.
 */
export function OpenProjectOnboardingLink({
  className,
  children,
  workspaceId = null,
}: Props) {
  const href = projectOnboardingHref({ workspaceId });

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    dispatchOpenProjectOnboarding({ workspaceId });
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
