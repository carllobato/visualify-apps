"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@visualify/design-system";
import { AccountSessionSignOutButton } from "./account-session-actions";
import { AccountSettingsTabs } from "./account-settings-tabs";
import { AppsAccessPanel } from "./apps-access-panel";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountSection } from "./delete-account-section";

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

  const cardClass =
    "[border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

  return (
    <AccountSettingsTabs
      profilePanel={
        <section className="space-y-4">
          <Card variant="default" className={cardClass}>
            <CardHeader className="!px-4 !py-2.5">
              <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Profile</h2>
            </CardHeader>
            <CardContent className="!px-4 !py-3">
              <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
                Values shown here come from your account metadata. Full profile editing (including saving to
                Visualify apps) is available in RiskAI under Account settings.
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--ds-text-muted)]">First name</dt>
                  <dd className="m-0 font-medium text-[var(--ds-text-primary)]">{firstName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ds-text-muted)]">Last name</dt>
                  <dd className="m-0 font-medium text-[var(--ds-text-primary)]">{lastName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ds-text-muted)]">Company</dt>
                  <dd className="m-0 font-medium text-[var(--ds-text-primary)]">{company ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ds-text-muted)]">Role</dt>
                  <dd className="m-0 font-medium text-[var(--ds-text-primary)]">{role ?? "—"}</dd>
                </div>
              </dl>
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
                    <p className="mt-1.5 text-sm text-[var(--ds-text-secondary)]">
                      Email changes are not currently available in-app.
                    </p>
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
  );
}
