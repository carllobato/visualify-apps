import Link from "next/link";
import { redirect } from "next/navigation";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { AccountProfileForm } from "./AccountProfileForm";
import { DeleteAccountSection } from "./DeleteAccountSection";
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
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-6 rounded-md border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-subtle-bg)] px-3 py-2 text-sm text-[var(--ds-status-warning-fg)]">
          <span className="font-medium">Dev preview:</span> sign in to use profile, delete account, and sign out.
        </p>
        <h1 className="mb-1 text-2xl font-semibold text-[var(--ds-text-primary)]">Account settings</h1>
        <p className="mb-8 text-sm text-[var(--ds-text-secondary)]">Your account details.</p>
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-medium text-[var(--ds-text-primary)]">Profile</h2>
          <div className="space-y-2 rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] p-4 text-sm text-[var(--ds-text-muted)]">
            <p>Form hidden — no session.</p>
          </div>
        </section>
        <Link
          href={riskaiPath("/portfolios")}
          className="inline-flex rounded-md border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
        >
          ← Back to portfolios
        </Link>
      </main>
    );
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const profileRow = await fetchPublicProfile(supabase, user.id);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)] mb-1">
        Account settings
      </h1>
      <p className="text-sm text-[var(--ds-text-secondary)] mb-8">
        Your account details.
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-medium text-[var(--ds-text-primary)] mb-3">
          Profile
        </h2>
        <div className="rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] p-4 space-y-4">
          <AccountProfileForm
            initialFirstName={profileRow?.first_name ?? (meta?.first_name as string | undefined)}
            initialLastName={profileRow?.surname ?? (meta?.last_name as string | undefined)}
            initialCompany={profileRow?.company ?? (meta?.company as string | undefined)}
            initialRole={profileRow?.role ?? (meta?.role as string | undefined)}
          />
        </div>
        <dl className="rounded-lg border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] p-4 space-y-2 text-sm mt-4">
          <div>
            <dt className="text-[var(--ds-text-muted)]">Email</dt>
            <dd className="font-medium text-[var(--ds-text-primary)]">
              {user.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ds-text-muted)]">User ID</dt>
            <dd className="font-mono text-xs text-[var(--ds-text-primary)] break-all">
              {user.id}
            </dd>
          </div>
        </dl>
      </section>

      <DeleteAccountSection />

      <div className="flex flex-wrap gap-3">
        <SignOutButton />
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
