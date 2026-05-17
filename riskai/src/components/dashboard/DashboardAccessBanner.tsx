"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Callout } from "@visualify/design-system";
import {
  OPEN_PORTFOLIO_ONBOARDING_EVENT,
  WORKSPACE_INVITE_ACCEPTED_QP,
  WORKSPACE_SETUP_PORTFOLIO_QP,
} from "@/lib/onboarding/types";

type Props = {
  workspaceLabel: string;
  isWorkspaceAdmin: boolean;
  showPostWorkspaceInvite: boolean;
  suggestPortfolioSetup: boolean;
};

export function DashboardAccessBanner({
  workspaceLabel,
  isWorkspaceAdmin,
  showPostWorkspaceInvite,
  suggestPortfolioSetup,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const stripQueryKeys = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of keys) params.delete(key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const dismissWelcome = useCallback(() => {
    setDismissed(true);
    stripQueryKeys([
      WORKSPACE_INVITE_ACCEPTED_QP,
      "invite_accepted",
      WORKSPACE_SETUP_PORTFOLIO_QP,
    ]);
  }, [stripQueryKeys]);

  useEffect(() => {
    if (!showPostWorkspaceInvite || !suggestPortfolioSetup || !isWorkspaceAdmin || dismissed) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event(OPEN_PORTFOLIO_ONBOARDING_EVENT));
    }, 400);
    return () => window.clearTimeout(t);
  }, [dismissed, isWorkspaceAdmin, showPostWorkspaceInvite, suggestPortfolioSetup]);

  if (!showPostWorkspaceInvite || dismissed) return null;

  return (
    <Callout status="success" className="mb-[var(--ds-space-5)] text-[length:var(--ds-text-sm)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="m-0 font-medium text-[var(--ds-text-primary)]">Workspace invitation accepted</p>
          <p className="m-0 mt-1 leading-relaxed text-[var(--ds-text-secondary)]">
            You now have <span className="font-medium">RiskAI app access</span> through{" "}
            <span className="font-medium">{workspaceLabel}</span>. Portfolios and projects are assigned
            separately—your dashboard will list them once a workspace admin or portfolio owner adds you.
          </p>
          {isWorkspaceAdmin ? (
            <p className="m-0 mt-2 leading-relaxed text-[var(--ds-text-secondary)]">
              As a workspace admin, you can create a portfolio here or manage members and apps in Visualify
              HQ.
            </p>
          ) : (
            <p className="m-0 mt-2 leading-relaxed text-[var(--ds-text-secondary)]">
              If you expected to see work already, ask your workspace admin to add you to a portfolio or
              project.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismissWelcome}
          className="shrink-0 self-start rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-3 py-1.5 text-[length:var(--ds-text-xs)] font-medium text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)]"
        >
          Got it
        </button>
      </div>
    </Callout>
  );
}
