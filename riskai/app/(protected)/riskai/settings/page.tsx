import Link from "next/link";
import { redirect } from "next/navigation";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { SignOutEverywhereButton } from "./SignOutEverywhereButton";
import { AccountProfileForm } from "./AccountProfileForm";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { AccountSettingsTabs } from "./AccountSettingsTabs";
import { LastLoginPanel } from "./LastLoginPanel";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Card, CardBody, CardFooter, CardHeader } from "@visualify/design-system";
import { riskaiPath } from "@/lib/routes";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";

/** User settings: authenticated users only (enforced by (protected) layout). */
export default async function UserSettingsPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDevAuthBypassEnabled()) {
    redirect(await buildLoginRedirectUrl(riskaiPath("/settings")));
  }

  if (!user) {
    return (
      <main className="w-full px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
        <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">Your account details.</p>
        <AccountSettingsTabs
          profilePanel={
            <>
              <p className="mb-6 rounded-[var(--ds-radius-md)] border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-subtle-bg)] px-3 py-2 text-sm text-[var(--ds-status-warning-fg)]">
                <span className="font-medium">Dev preview:</span> sign in to use profile, delete account, and sign
                out.
              </p>
              <section className="mb-10">
                <div className="space-y-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] p-4 text-sm text-[var(--ds-text-muted)]">
                  <p>Form hidden — no session.</p>
                </div>
              </section>
            </>
          }
          dangerPanel={
            <p className="mb-10 text-sm text-[var(--ds-text-muted)]">
              Sign in to review account deletion options.
            </p>
          }
        />
        <Link
          href={riskaiPath("/portfolios")}
          className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
        >
          ← Back to portfolios
        </Link>
      </main>
    );
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const profileRow = await fetchPublicProfile(supabase, user.id);

  const { data: sessionRow } = await supabase
    .from("visualify_user_sessions")
    .select("updated_at, last_seen_at, user_agent")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="w-full px-4 py-6 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
      <p className="mb-6 text-sm text-[var(--ds-text-secondary)]">Your account details.</p>

      <AccountSettingsTabs
        profilePanel={
          <section className="space-y-4">
            <Card>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Profile</h2>
              </CardHeader>
              <CardBody className="!px-4 !py-3">
                <AccountProfileForm
                  initialFirstName={profileRow?.first_name ?? (meta?.first_name as string | undefined)}
                  initialLastName={profileRow?.surname ?? (meta?.last_name as string | undefined)}
                  initialCompany={profileRow?.company ?? (meta?.company as string | undefined)}
                  initialRole={profileRow?.role ?? (meta?.role as string | undefined)}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Account info</h2>
              </CardHeader>
              <CardBody className="!px-4 !py-3">
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[var(--ds-text-muted)]">Email</dt>
                    <dd className="m-0">
                      <span className="font-medium text-[var(--ds-text-primary)]">{user.email ?? "—"}</span>
                      <p className="mt-1.5 text-sm text-[var(--ds-text-secondary)]">
                        Email changes are not currently available in-app.
                      </p>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ds-text-muted)]">User ID</dt>
                    <dd className="font-mono text-xs break-all text-[var(--ds-text-primary)]">{user.id}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Password</h2>
              </CardHeader>
              <CardBody className="!px-4 !py-3">
                <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
                  Use a strong password you don&apos;t use elsewhere. You&apos;ll need your current password to
                  confirm.
                </p>
                <ChangePasswordForm />
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="!px-4 !py-2.5">
                <h2 className="m-0 text-sm font-semibold text-[var(--ds-text-primary)]">Session &amp; security</h2>
              </CardHeader>
              <CardBody className="!px-4 !py-3">
                <LastLoginPanel
                  updatedAt={sessionRow?.updated_at ?? null}
                  lastSeenAt={sessionRow?.last_seen_at ?? null}
                  userAgent={sessionRow?.user_agent ?? null}
                />
              </CardBody>
              <CardFooter className="!px-4 !py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <SignOutButton />
                  <SignOutEverywhereButton />
                </div>
              </CardFooter>
            </Card>
          </section>
        }
        dangerPanel={<DeleteAccountSection />}
      />
    </main>
  );
}
