"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Label,
} from "@visualify/design-system";
import { AccountSessionSignOutButton } from "./account-session-actions";
import { AccountSettingsTabs } from "./account-settings-tabs";
import { AppsAccessPanel } from "./apps-access-panel";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountSection } from "./delete-account-section";

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

export function AccountSettingsClient(props: {
  email: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  /** App IDs this user may open; replace with entitlement API later. */
  grantedAppIds: readonly string[];
}) {
  const { email, userId, firstName, lastName, company, role, grantedAppIds } = props;
  const router = useRouter();

  const [saved, setSaved] = useState(() => draftFromProps(props));
  const [draft, setDraft] = useState(() => draftFromProps(props));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const next = draftFromProps({
      firstName,
      lastName,
      company,
      role,
    });
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
      const res = await fetch("/api/me/profile", {
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
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [draft, router]);

  const cardClass =
    "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
        {profileDirty ? (
          <div
            className="flex shrink-0 flex-wrap items-center gap-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-3 py-2 shadow-[var(--ds-elevation-tile)]"
            role="region"
            aria-label="Unsaved profile changes"
          >
            <span className="text-sm text-[var(--ds-text-secondary)]">Unsaved profile changes</span>
            {saveError ? (
              <span className="max-w-[min(100%,280px)] text-sm text-[var(--ds-status-danger-fg)]">
                {saveError}
              </span>
            ) : null}
            <Button type="button" variant="secondary" disabled={saving} onClick={() => discardProfile()}>
              Discard
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => void saveProfile()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </div>

      <AccountSettingsTabs
        profilePanel={
          <section className="space-y-4">
            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Details</h2>
              </CardHeader>
              <CardContent className="!p-4">
                <div className="flex flex-col gap-4 text-sm">
                  <div className="max-w-md">
                    <Label htmlFor="hq-profile-first-name" className="!mb-1">
                      First name{" "}
                      <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
                        *
                      </span>
                    </Label>
                    <Input
                      id="hq-profile-first-name"
                      value={draft.firstName}
                      onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                      autoComplete="given-name"
                      disabled={saving}
                    />
                  </div>
                  <div className="max-w-md">
                    <Label htmlFor="hq-profile-last-name" className="!mb-1">
                      Last name{" "}
                      <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
                        *
                      </span>
                    </Label>
                    <Input
                      id="hq-profile-last-name"
                      value={draft.lastName}
                      onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                      autoComplete="family-name"
                      disabled={saving}
                    />
                  </div>
                  <div className="max-w-md">
                    <Label htmlFor="hq-profile-company" className="!mb-1">
                      Company{" "}
                      <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>
                        *
                      </span>
                    </Label>
                    <Input
                      id="hq-profile-company"
                      value={draft.company}
                      onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
                      autoComplete="organization"
                      disabled={saving}
                    />
                  </div>
                  <div className="max-w-md">
                    <Label htmlFor="hq-profile-role" className="!mb-1">
                      Role
                    </Label>
                    <Input
                      id="hq-profile-role"
                      value={draft.role}
                      onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                      autoComplete="organization-title"
                      disabled={saving}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Account info</h2>
              </CardHeader>
              <CardContent className="!px-4 !py-3">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[var(--ds-text-muted)]">Email</dt>
                    <dd className="m-0">
                      <span className="font-medium text-[var(--ds-text-primary)]">{email ?? "—"}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ds-text-muted)]">User ID</dt>
                    <dd className="font-mono text-xs break-all text-[var(--ds-text-primary)]">{userId}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </section>
        }
        appsPanel={<AppsAccessPanel grantedAppIds={grantedAppIds} />}
        authenticationPanel={
          <section className="space-y-4">
            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Password</h2>
              </CardHeader>
              <CardContent className="!px-4 !py-3">
                <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
                  Use a strong password you don&apos;t use elsewhere. You&apos;ll need your current password to
                  confirm.
                </p>
                <ChangePasswordForm />
              </CardContent>
            </Card>

            <Card variant="default" className={cardClass}>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Session</h2>
              </CardHeader>
              <CardContent className="!px-4 !py-3">
                <p className="text-sm text-[var(--ds-text-secondary)]">
                  Sign out of Visualify HQ on this browser. Other sessions may stay active until they expire or
                  you sign out elsewhere.
                </p>
              </CardContent>
              <CardFooter className="!px-4 !py-3">
                <AccountSessionSignOutButton />
              </CardFooter>
            </Card>
          </section>
        }
        dangerPanel={<DeleteAccountSection />}
      />
    </>
  );
}
