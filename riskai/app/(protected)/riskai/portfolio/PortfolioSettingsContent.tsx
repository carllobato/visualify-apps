"use client";

/**
 * Portfolio Settings: editable name and description, members (API-driven), and read-only meta.
 * Mirrors the editable form pattern used on the project settings page.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { riskaiPath } from "@/lib/routes";
import { useRouter } from "next/navigation";
import { PortfolioMembersSection } from "@/components/portfolio/PortfolioMembersSection";
import { SettingsPermissionNotice } from "@/components/settings/SettingsPermissionNotice";
import {
  settingsCardClass,
  settingsFieldLockedClass,
  settingsInputClass,
  settingsInputErrorClassSingleLine,
  settingsLabelClass,
  settingsPrimaryButtonClass,
  settingsSectionTitleClass,
  settingsStandaloneSectionTitleClass,
  settingsTextareaClass,
} from "@/components/settings/settingsFieldClasses";
import type { PortfolioMemberCapabilityFlags } from "@/lib/db/portfolioMemberAccess";
import { getPortfolioSettingsPermissionNotice } from "@/lib/settings/settingsPermissionMessages";
import { Callout, FieldError } from "@visualify/design-system";

export type PortfolioSettingsInitial = {
  name: string;
  description: string | null;
  owner_user_id: string;
  created_at: string | null;
};

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

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
  const { canEditPortfolioDetails } = memberCapabilities;
  const permissionNotice = useMemo(
    () => getPortfolioSettingsPermissionNotice(memberCapabilities),
    [memberCapabilities]
  );
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
  }, [portfolioId, name, description, router, canEditPortfolioDetails]);

  return (
    <main className="w-full px-4 sm:px-6 py-10">
      {permissionNotice && (
        <SettingsPermissionNotice>{permissionNotice}</SettingsPermissionNotice>
      )}

      {/* Editable Settings */}
      <section className={settingsCardClass + " mb-6"}>
        <h2 className={settingsSectionTitleClass}>Settings</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="portfolio-name" className={settingsLabelClass}>
              Name <span className="text-[var(--ds-status-danger)]">*</span>
            </label>
            <input
              id="portfolio-name"
              type="text"
              readOnly={!canEditPortfolioDetails}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setValidation((prev) => ({ ...prev, name: "" }));
              }}
              className={
                (validation.name ? settingsInputErrorClassSingleLine : settingsInputClass) +
                (!canEditPortfolioDetails ? ` ${settingsFieldLockedClass}` : "")
              }
              placeholder="e.g. Infrastructure Portfolio"
            />
            {validation.name && <FieldError className="!mt-1">{validation.name}</FieldError>}
          </div>
          <div>
            <label htmlFor="portfolio-description" className={settingsLabelClass}>
              Description (optional)
            </label>
            <textarea
              id="portfolio-description"
              rows={3}
              readOnly={!canEditPortfolioDetails}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={
                settingsTextareaClass +
                (!canEditPortfolioDetails ? ` ${settingsFieldLockedClass}` : "")
              }
              placeholder="Brief description of this portfolio"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!canEditPortfolioDetails || !isFormValid || saving}
            className={settingsPrimaryButtonClass}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {validation.submit && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {validation.submit}
            </Callout>
          )}
        </div>
        {saved && (
          <div
            className="mt-3 rounded-lg border border-[var(--ds-status-success-border)] bg-[var(--ds-status-success-subtle-bg)] px-4 py-2.5 text-sm text-[var(--ds-status-success-fg)]"
            role="status"
          >
            Saved ✓ Portfolio settings updated.
          </div>
        )}
      </section>

      <PortfolioMembersSection portfolioId={portfolioId} />

      {/* Read-only meta */}
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
            <dd className="text-[var(--ds-text-primary)]">
              {formatDate(initial.created_at)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={riskaiPath(`/portfolios/${portfolioId}/projects`)}
          className="inline-flex px-4 py-2 text-sm font-medium rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
        >
          View projects
        </Link>
        <Link
          href={riskaiPath("/portfolios")}
          className="inline-flex px-4 py-2 text-sm font-medium rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)]"
        >
          ← Back to portfolios
        </Link>
      </div>
    </main>
  );
}
