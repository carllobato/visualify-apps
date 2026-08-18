"use client";

import { useEffect } from "react";
import { WorkspaceSettingsTabsNav } from "@/components/workspace/WorkspaceSettingsTabsNav";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { Card, CardBody, CardHeader } from "@visualify/design-system";

export type WorkspaceSettingsBillingContentProps = {
  workspaceId: string;
};

export function WorkspaceSettingsBillingContent({ workspaceId }: WorkspaceSettingsBillingContentProps) {
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;

  useEffect(() => {
    if (!setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "", end: null });
    return () => setPageHeaderExtras(null);
  }, [setPageHeaderExtras]);

  return (
    <main className="w-full px-4 py-6 sm:px-6">
      <WorkspaceSettingsTabsNav workspaceId={workspaceId} activeTab="billing" />

      <Card className="mb-4">
        <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Billing</h2>
        </CardHeader>
        <CardBody className="!px-4 !py-3">
          <p className="mb-4 text-sm text-[var(--ds-text-secondary)]">
            Manage your RiskAI subscription and billing.
          </p>
          <div className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] px-4 py-3 text-sm text-[var(--ds-text-muted)]">
            Billing management will be available here soon.
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
