"use client";

/**
 * Portfolio Settings: editable name and description, members (API-driven), and read-only meta.
 * Mirrors the editable form pattern used on the project settings page.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortfolioMembersSection } from "@/components/portfolio/PortfolioMembersSection";
import { SettingsPermissionNotice } from "@/components/settings/SettingsPermissionNotice";
import { riskaiPath } from "@/lib/routes";
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
  DEFAULT_REPORTING_CURRENCY,
  DEFAULT_REPORTING_UNIT,
  REPORTING_CURRENCY_OPTIONS,
  REPORTING_UNIT_LABELS,
  REPORTING_UNIT_OPTIONS,
} from "@/lib/portfolio/reportingPreferences";
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
  /** Name from profile, else profile email (sign-in identity). */
  owner_username: string;
  owner_company: string;
  created_at: string | null;
  reporting_currency: string | null;
  reporting_unit: string | null;
};

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

/** Details tab values: Geist Mono via `font-mono`, matches Portfolio ID row. */
const portfolioDetailsValueClass =
  "font-mono text-xs text-[var(--ds-text-primary)] break-all";

type PortfolioSettingsTab = "general" | "members" | "details" | "danger";

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** Match PATCH payload normalization so “dirty” matches what would actually be saved. */
  const normalizeDescriptionForCompare = useCallback((raw: string | null | undefined) => {
    const t = (raw ?? "").trim();
    return t === "" ? null : t;
  }, []);

  useEffect(() => {
    setName(initial.name);
    setDescription(initial.description ?? "");
    setReportingCurrency(initial.reporting_currency ?? DEFAULT_REPORTING_CURRENCY);
    setReportingUnit(initial.reporting_unit ?? DEFAULT_REPORTING_UNIT);
  }, [
    initial.name,
    initial.description,
    initial.reporting_currency,
    initial.reporting_unit,
  ]);

  const isFormValid = name.trim().length > 0;

  const isDirty = useMemo(() => {
    if (
      name.trim() !== initial.name.trim() ||
      normalizeDescriptionForCompare(description) !== normalizeDescriptionForCompare(initial.description) ||
      reportingCurrency !== (initial.reporting_currency ?? DEFAULT_REPORTING_CURRENCY) ||
      reportingUnit !== (initial.reporting_unit ?? DEFAULT_REPORTING_UNIT)
    ) {
      return true;
    }
    return false;
  }, [
    name,
    description,
    reportingCurrency,
    reportingUnit,
    initial.name,
    initial.description,
    initial.reporting_currency,
    initial.reporting_unit,
    normalizeDescriptionForCompare,
  ]);

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
        disabled={!canEditPortfolioDetails || !isFormValid || saving || !isDirty}
        title={
          canEditPortfolioDetails && isFormValid && !saving && !isDirty ? "No changes to save" : undefined
        }
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    ),
    [onSave, canEditPortfolioDetails, isDirty, isFormValid, saving]
  );

  useEffect(() => {
    if (!setPageHeaderExtras) return;
    // Title comes from URL in PortfolioPageHeader; only register the Save action.
    setPageHeaderExtras({ titleSuffix: "", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, setPageHeaderExtras]);

  const readOnlyChrome = !canEditPortfolioDetails ? ` ${projectSettingsReadOnlyFieldClass}` : "";

  const confirmDeletePortfolio = useCallback(async () => {
    if (!canEditPortfolioDetails) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete portfolio.");
        setDeleting(false);
        return;
      }
      router.replace(riskaiPath("/portfolios"));
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Try again.");
      setDeleting(false);
    }
  }, [canEditPortfolioDetails, portfolioId, router]);

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
          {canEditPortfolioDetails && (
            <Tab active={activeTab === "danger"} onClick={() => setActiveTab("danger")}>
              Danger Zone
            </Tab>
          )}
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
                Saved ✓ Portfolio Settings updated.
              </span>
            </Callout>
          )}
        </>
      )}

      {activeTab === "members" && <PortfolioMembersSection portfolioId={portfolioId} />}

      {activeTab === "details" && (
        <Card className="mb-4">
          <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
          </CardHeader>
          <CardBody className="!px-4 !py-3">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--ds-text-muted)]">Portfolio ID</dt>
                <dd className={portfolioDetailsValueClass}>{portfolioId}</dd>
              </div>
              <div>
                <dt className="text-[var(--ds-text-muted)]">Owner username</dt>
                <dd className={portfolioDetailsValueClass}>{initial.owner_username}</dd>
              </div>
              <div>
                <dt className="text-[var(--ds-text-muted)]">Owner Company</dt>
                <dd className={portfolioDetailsValueClass}>{initial.owner_company}</dd>
              </div>
              <div>
                <dt className="text-[var(--ds-text-muted)]">Created</dt>
                <dd className={portfolioDetailsValueClass}>{formatDate(initial.created_at)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      )}

      {activeTab === "danger" && canEditPortfolioDetails && (
        <Card>
          <CardHeader className="!px-4 !py-2.5">
            <h2 className="m-0 text-sm font-semibold text-[var(--ds-status-danger-fg)]">Danger Zone</h2>
          </CardHeader>
          <CardBody className="!px-4 !py-3">
            <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
              Permanently delete this portfolio and all projects under it. This also removes project risks,
              simulation runs, settings, team membership, and pending invitations.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:border-[var(--ds-status-danger-border)] hover:bg-[var(--ds-status-danger-bg)]"
            >
              Delete portfolio
            </Button>
          </CardBody>
        </Card>
      )}

      {deleteOpen ? (
        <div
          className="ds-modal-backdrop z-[120]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-portfolio-title"
          aria-describedby="delete-portfolio-desc"
          onClick={() => !deleting && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-portfolio-title"
              className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
            >
              Delete portfolio?
            </h3>
            <p id="delete-portfolio-desc" className="mt-2 text-sm text-[var(--ds-text-secondary)]">
              Are you sure? This can&apos;t be undone. The portfolio and every project under it will be
              deleted, including their risks, simulation runs, settings, team membership, and pending
              invitations.
            </p>
            {deleteError && (
              <Callout status="danger" role="alert" className="mt-3 text-[length:var(--ds-text-sm)] leading-relaxed">
                {deleteError}
              </Callout>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                variant="secondary"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={deleting}
                onClick={() => void confirmDeletePortfolio()}
                className="bg-[var(--ds-status-danger-strong-bg)] text-[var(--ds-status-danger-strong-fg)] shadow-none hover:bg-[var(--ds-status-danger-strong-bg)] hover:opacity-90"
              >
                {deleting ? "Deleting…" : "Yes, delete this portfolio"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
