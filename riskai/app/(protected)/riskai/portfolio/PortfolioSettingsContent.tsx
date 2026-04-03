"use client";

/**
 * Portfolio Settings: editable name and description, members (API-driven), and read-only meta.
 * Mirrors the editable form pattern used on the project settings page.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortfolioMembersSection } from "@/components/portfolio/PortfolioMembersSection";
import { SettingsPermissionNotice } from "@/components/settings/SettingsPermissionNotice";
import { settingsStandaloneSectionTitleClass } from "@/components/settings/settingsFieldClasses";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
  projectSettingsReadOnlyFieldClass,
  projectSettingsSelectClass,
  projectSettingsTextareaClass,
} from "@/components/project/projectSettingsDsFormClasses";
import type { PortfolioMemberCapabilityFlags } from "@/lib/db/portfolioMemberAccess";
import { getPortfolioSettingsPermissionNotice } from "@/lib/settings/settingsPermissionMessages";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  Label,
  Tab,
  Tabs,
} from "@visualify/design-system";

export type PortfolioSettingsInitial = {
  name: string;
  description: string | null;
  owner_user_id: string;
  created_at: string | null;
  reporting_currency: string | null;
  reporting_unit: string | null;
};

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

const DEFAULT_REPORTING_CURRENCY = "AUD";
const DEFAULT_REPORTING_UNIT = "MILLIONS";

const REPORTING_CURRENCY_OPTIONS = ["AUD", "USD", "GBP"] as const;
const REPORTING_UNIT_OPTIONS = ["THOUSANDS", "MILLIONS", "BILLIONS"] as const;

type PortfolioSettingsTab = "general" | "members" | "details";

export type PortfolioSettingsContentProps = {
  portfolioId: string;
  memberCapabilities: PortfolioMemberCapabilityFlags;
  initial: PortfolioSettingsInitial;
};

function formatDate(s: string | null) {
  return s ? new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export default function PortfolioSettingsContent({
  portfolioId,
  memberCapabilities,
  initial,
}: PortfolioSettingsContentProps) {
  const router = useRouter();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const { canEditPortfolioDetails } = memberCapabilities;
  const permissionNotice = useMemo(
    () => getPortfolioSettingsPermissionNotice(memberCapabilities),
    [memberCapabilities]
  );
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [reportingCurrency, setReportingCurrency] = useState(
    () => initial.reporting_currency ?? DEFAULT_REPORTING_CURRENCY
  );
  const [reportingUnit, setReportingUnit] = useState(
    () => initial.reporting_unit ?? DEFAULT_REPORTING_UNIT
  );
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioSettingsTab>("general");

  const isFormValid = name.trim().length > 0;

  const onSave = useCallback(async () => {
    if (!canEditPortfolioDetails) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidation({ name: "Name is required" });
      return;
    }
    setValidation({});
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          reporting_currency: reportingCurrency,
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
  }, [
    portfolioId,
    name,
    description,
    reportingCurrency,
    reportingUnit,
    router,
    canEditPortfolioDetails,
  ]);

  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="primary"
        onClick={onSave}
        disabled={!canEditPortfolioDetails || !isFormValid || saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    ),
    [onSave, canEditPortfolioDetails, isFormValid, saving]
  );

  useEffect(() => {
    if (!setPageHeaderExtras) return;
    // Title comes from URL in PortfolioPageHeader; only register the Save action.
    setPageHeaderExtras({ titleSuffix: "", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, setPageHeaderExtras]);

  const readOnlyChrome = !canEditPortfolioDetails ? ` ${projectSettingsReadOnlyFieldClass}` : "";

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
          <Tab active={activeTab === "members"} onClick={() => setActiveTab("members")}>
            Team
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
              <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Portfolio details</h2>
            </CardHeader>
            <CardBody className="!px-4 !py-3">
              <div className="max-w-2xl space-y-3">
                <div className={projectSettingsFieldWidthClass("sm")}>
                  <Label htmlFor="portfolio-name" className="!mb-1">
                    Portfolio Name{" "}
                    <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
                      *
                    </span>
                  </Label>
                  <input
                    id="portfolio-name"
                    type="text"
                    readOnly={!canEditPortfolioDetails}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setValidation((prev) => ({ ...prev, name: "" }));
                    }}
                    aria-invalid={!!validation.name}
                    className={projectSettingsInputClass(!!validation.name) + readOnlyChrome}
                    placeholder="e.g. Infrastructure Portfolio"
                  />
                  {validation.name ? <FieldError className="!mt-1">{validation.name}</FieldError> : null}
                </div>
                <div className={projectSettingsFieldWidthClass("md")}>
                  <Label htmlFor="portfolio-description" className="!mb-1">
                    Description (optional)
                  </Label>
                  <textarea
                    id="portfolio-description"
                    rows={3}
                    readOnly={!canEditPortfolioDetails}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={projectSettingsTextareaClass(false) + readOnlyChrome}
                    placeholder="Brief description of this portfolio"
                  />
                </div>
                <div className={projectSettingsFieldWidthClass("sm")}>
                  <Label htmlFor="portfolio-reporting-currency" className="!mb-1">
                    Reporting currency
                  </Label>
                  <select
                    id="portfolio-reporting-currency"
                    value={reportingCurrency}
                    onChange={(e) => setReportingCurrency(e.target.value)}
                    disabled={!canEditPortfolioDetails}
                    className={projectSettingsSelectClass(false, "sm") + readOnlyChrome}
                  >
                    {REPORTING_CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={projectSettingsFieldWidthClass("sm")}>
                  <Label htmlFor="portfolio-reporting-unit" className="!mb-1">
                    Reporting unit
                  </Label>
                  <select
                    id="portfolio-reporting-unit"
                    value={reportingUnit}
                    onChange={(e) => setReportingUnit(e.target.value)}
                    disabled={!canEditPortfolioDetails}
                    className={projectSettingsSelectClass(false, "sm") + readOnlyChrome}
                  >
                    {REPORTING_UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
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
                Saved ✓ Portfolio Settings updated.
              </span>
            </Callout>
          )}
        </>
      )}

      {activeTab === "members" && <PortfolioMembersSection portfolioId={portfolioId} />}

      {activeTab === "details" && (
      <section className="mb-10">
        <h2 className={settingsStandaloneSectionTitleClass}>Details</h2>
        <dl className="rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] p-4 space-y-2 text-sm">
          <div>
            <dt className="text-[var(--ds-text-muted)]">Owner ID</dt>
            <dd className="font-mono text-xs text-[var(--ds-text-primary)] break-all">
              {initial.owner_user_id}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ds-text-muted)]">Created</dt>
            <dd className="font-medium text-[var(--ds-text-primary)]">
              {formatDate(initial.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ds-text-muted)]">Reporting currency</dt>
            <dd className="font-medium text-[var(--ds-text-primary)]">
              {initial.reporting_currency ?? DEFAULT_REPORTING_CURRENCY}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ds-text-muted)]">Reporting unit</dt>
            <dd className="font-medium text-[var(--ds-text-primary)]">
              {initial.reporting_unit ?? DEFAULT_REPORTING_UNIT}
            </dd>
          </div>
        </dl>
      </section>
      )}
    </main>
  );
}
