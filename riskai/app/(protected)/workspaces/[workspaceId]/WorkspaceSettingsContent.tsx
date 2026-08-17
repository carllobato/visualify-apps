"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsPermissionNotice } from "@/components/settings/SettingsPermissionNotice";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
  projectSettingsReadOnlyFieldClass,
  projectSettingsSelectClass,
} from "@/components/project/projectSettingsDsFormClasses";
import { getWorkspaceSettingsPermissionNotice } from "@/lib/settings/settingsPermissionMessages";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { canPersistWorkspaceReportingUnit } from "@/lib/workspace/canPersistWorkspaceReportingUnit";
import {
  REPORTING_UNIT_LABELS,
  REPORTING_UNIT_OPTIONS,
  type ReportingUnitOption,
} from "@/lib/portfolio/reportingPreferences";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Label,
  Tab,
  Tabs,
} from "@visualify/design-system";

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

const workspaceDetailsValueClass =
  "font-mono text-xs text-[var(--ds-text-primary)] break-all";

type WorkspaceSettingsTab = "general" | "details";

export type WorkspaceSettingsContentProps = {
  workspaceName: string;
  workspaceId: string;
  workspaceSlug: string;
  reportingUnit: ReportingUnitOption;
  uniquePortfolioId: string | null;
  canEditWorkspaceDetails: boolean;
};

export function WorkspaceSettingsContent({
  workspaceName,
  workspaceId,
  workspaceSlug,
  reportingUnit: initialReportingUnit,
  uniquePortfolioId,
  canEditWorkspaceDetails,
}: WorkspaceSettingsContentProps) {
  const router = useRouter();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const canEditReportingUnit = canPersistWorkspaceReportingUnit({
    canEditWorkspaceDetails,
    uniquePortfolioId,
  });
  const permissionNotice = useMemo(
    () => getWorkspaceSettingsPermissionNotice(canEditWorkspaceDetails),
    [canEditWorkspaceDetails]
  );

  const [reportingUnit, setReportingUnit] = useState(initialReportingUnit);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceSettingsTab>("general");

  useEffect(() => {
    setReportingUnit(initialReportingUnit);
  }, [initialReportingUnit]);

  const isDirty = reportingUnit !== initialReportingUnit;

  const onSave = useCallback(async () => {
    if (!canEditReportingUnit || !uniquePortfolioId) return;
    setValidation({});
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolios/${uniquePortfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporting_unit: reportingUnit,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setValidation({ submit: (data as { error?: string }).error ?? "Failed to save" });
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), SAVED_CONFIRM_AUTO_HIDE_MS);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [canEditReportingUnit, uniquePortfolioId, reportingUnit, router]);

  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="primary"
        onClick={onSave}
        disabled={!canEditReportingUnit || saving || !isDirty}
        title={
          canEditReportingUnit && !saving && !isDirty ? "No changes to save" : undefined
        }
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    ),
    [onSave, canEditReportingUnit, isDirty, saving]
  );

  useEffect(() => {
    if (!setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, setPageHeaderExtras]);

  const reportingUnitDisabled = !canEditReportingUnit;

  return (
    <main className="w-full px-4 py-6 sm:px-6">
      {permissionNotice && (
        <SettingsPermissionNotice>{permissionNotice}</SettingsPermissionNotice>
      )}

      <div className="mb-4 border-b border-[var(--ds-border)]">
        <Tabs>
          <Tab active={activeTab === "general"} onClick={() => setActiveTab("general")}>
            General
          </Tab>
          <Tab active={activeTab === "details"} onClick={() => setActiveTab("details")}>
            Details
          </Tab>
        </Tabs>
      </div>

      {activeTab === "general" && (
        <>
          <Card className="mb-4">
            <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
              <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Workspace details</h2>
            </CardHeader>
            <CardBody className="!px-4 !py-3">
              <div className="max-w-2xl space-y-3">
                <div className={projectSettingsFieldWidthClass("sm")}>
                  <Label htmlFor="workspace-name" className="!mb-1">
                    Workspace name
                  </Label>
                  <input
                    id="workspace-name"
                    type="text"
                    readOnly
                    value={workspaceName}
                    className={projectSettingsInputClass(false) + ` ${projectSettingsReadOnlyFieldClass}`}
                  />
                </div>
                <div className={projectSettingsFieldWidthClass("sm")}>
                  <Label htmlFor="workspace-reporting-unit" className="!mb-1">
                    Reporting unit
                  </Label>
                  <select
                    id="workspace-reporting-unit"
                    value={reportingUnit}
                    onChange={(e) => setReportingUnit(e.target.value as ReportingUnitOption)}
                    disabled={reportingUnitDisabled}
                    className={
                      projectSettingsSelectClass(false, "sm") +
                      (reportingUnitDisabled ? ` ${projectSettingsReadOnlyFieldClass}` : "")
                    }
                  >
                    {REPORTING_UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {REPORTING_UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>
          {validation.submit && (
            <Callout status="danger" role="alert" className="mb-4 text-[length:var(--ds-text-sm)]">
              {validation.submit}
            </Callout>
          )}
          {saved && (
            <Callout
              status="success"
              className="mt-3 !border-[var(--ds-border-subtle)] !px-3 !py-2"
              role="status"
            >
              <span className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                Saved ✓ Workspace Settings updated.
              </span>
            </Callout>
          )}
        </>
      )}

      {activeTab === "details" && (
        <Card className="mb-4">
          <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
          </CardHeader>
          <CardBody className="!px-4 !py-3">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--ds-text-muted)]">Workspace ID</dt>
                <dd className={workspaceDetailsValueClass}>{workspaceId}</dd>
              </div>
              <div>
                <dt className="text-[var(--ds-text-muted)]">Slug</dt>
                <dd className={workspaceDetailsValueClass}>{workspaceSlug}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
