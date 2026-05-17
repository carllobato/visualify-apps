"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button, Input, Label } from "@visualify/design-system";
import {
  AccountSettingsCard,
  AccountSettingsCardContent,
  AccountSettingsCardHeader,
} from "./AccountSettingsCard";
import { accountSettingsPanelSectionClassName } from "./classes";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  company: string;
  role: string;
};

function draftFromProps(p: {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
}): ProfileDraft {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    company: p.company ?? "",
    role: p.role ?? "",
  };
}

function draftsDirty(a: ProfileDraft, b: ProfileDraft): boolean {
  const keys: (keyof ProfileDraft)[] = ["firstName", "lastName", "company", "role"];
  for (const k of keys) {
    if (a[k].trim() !== b[k].trim()) return true;
  }
  return false;
}

export type AccountSettingsProfilePanelProps = {
  email: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  profileSaveApiPath?: string;
  onProfileSaved?: () => void;
  lastNameFieldLabel?: string;
  idPrefix?: string;
};

export function useAccountSettingsProfilePanel({
  email,
  userId,
  firstName,
  lastName,
  company,
  role,
  profileSaveApiPath = "/api/me/profile",
  onProfileSaved,
  lastNameFieldLabel = "Last name",
  idPrefix: idPrefixProp,
}: AccountSettingsProfilePanelProps) {
  const reactId = useId().replace(/:/g, "");
  const idPrefix = idPrefixProp ?? `account-profile-${reactId}`;
  const router = useRouter();

  const [saved, setSaved] = useState(() => draftFromProps({ firstName, lastName, company, role }));
  const [draft, setDraft] = useState(() => draftFromProps({ firstName, lastName, company, role }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const next = draftFromProps({ firstName, lastName, company, role });
    setSaved(next);
    setDraft(next);
    setSaveError(null);
  }, [firstName, lastName, company, role]);

  const profileDirty = useMemo(() => draftsDirty(draft, saved), [draft, saved]);

  const discardProfile = useCallback(() => {
    setDraft(saved);
    setSaveError(null);
  }, [saved]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(profileSaveApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          first_name: draft.firstName.trim(),
          last_name: draft.lastName.trim(),
          company: draft.company.trim(),
          role: draft.role.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSaveError(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : `Save failed (${res.status})`,
        );
        return;
      }
      const normalized = draftFromProps({
        firstName: draft.firstName.trim() || null,
        lastName: draft.lastName.trim() || null,
        company: draft.company.trim() || null,
        role: draft.role.trim() || null,
      });
      setSaved(normalized);
      setDraft(normalized);
      onProfileSaved?.();
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [draft, onProfileSaved, profileSaveApiPath, router]);

  const headerActions = profileDirty ? (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2 shadow-[var(--ds-elevation-tile)]"
      role="region"
      aria-label="Unsaved profile changes"
    >
      <span className="text-sm text-[var(--ds-text-secondary)]">Unsaved profile changes</span>
      {saveError ? (
        <span className="max-w-[min(100%,280px)] text-sm text-[var(--ds-status-danger-fg)]">{saveError}</span>
      ) : null}
      <Button type="button" variant="secondary" disabled={saving} onClick={() => discardProfile()}>
        Discard
      </Button>
      <Button type="button" variant="primary" disabled={saving} onClick={() => void saveProfile()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  ) : null;

  const panel = (
    <section className={accountSettingsPanelSectionClassName}>
      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Profile" />
        <AccountSettingsCardContent padding="form">
          <div className="flex flex-col gap-4 text-sm">
            <ProfileField
              id={`${idPrefix}-first-name`}
              label="First name"
              required
              value={draft.firstName}
              onChange={(value) => setDraft((d) => ({ ...d, firstName: value }))}
              autoComplete="given-name"
              disabled={saving}
            />
            <ProfileField
              id={`${idPrefix}-last-name`}
              label={lastNameFieldLabel}
              required
              value={draft.lastName}
              onChange={(value) => setDraft((d) => ({ ...d, lastName: value }))}
              autoComplete="family-name"
              disabled={saving}
            />
            <ProfileField
              id={`${idPrefix}-company`}
              label="Company"
              required
              value={draft.company}
              onChange={(value) => setDraft((d) => ({ ...d, company: value }))}
              autoComplete="organization"
              disabled={saving}
            />
            <ProfileField
              id={`${idPrefix}-role`}
              label="Role"
              value={draft.role}
              onChange={(value) => setDraft((d) => ({ ...d, role: value }))}
              autoComplete="organization-title"
              disabled={saving}
              placeholder="Optional"
            />
          </div>
        </AccountSettingsCardContent>
      </AccountSettingsCard>

      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Account info" />
        <AccountSettingsCardContent>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[var(--ds-text-muted)]">Email</dt>
              <dd className="m-0 font-medium text-[var(--ds-text-primary)]">{email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--ds-text-muted)]">User ID</dt>
              <dd className="font-mono text-xs break-all text-[var(--ds-text-primary)]">{userId}</dd>
            </div>
          </dl>
        </AccountSettingsCardContent>
      </AccountSettingsCard>
    </section>
  );

  return { panel, headerActions, isDirty: profileDirty };
}

export function AccountSettingsProfilePanel(props: AccountSettingsProfilePanelProps) {
  const { panel } = useAccountSettingsProfilePanel(props);
  return panel;
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  required = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="max-w-md">
      <Label htmlFor={id} className="!mb-1">
        {label}{" "}
        {required ? (
          <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}
