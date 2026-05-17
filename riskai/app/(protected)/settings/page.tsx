import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AccountSettingsHeader,
  AccountSettingsPage,
  AccountSettingsTabs,
} from "@visualify/app-shell";
import { isDevAuthBypassEnabled } from "@/lib/dev/devAuthBypass";
import { fetchPublicProfile } from "@/lib/profiles/profileDb";
import { supabaseServerClient } from "@/lib/supabase/server";
import { AccountSettingsSignedIn } from "./account-settings-signed-in";
import { riskaiPath } from "@/lib/routes";
import { buildLoginRedirectUrl } from "@/lib/auth/loginRedirect";
import { listFactorsIndicatesVerifiedTotp } from "@/lib/auth/mfa";
import { RISKAI_ENABLE_APP_SHELL } from "@/lib/riskai-app-shell-flag";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";

/** User settings: authenticated users only (enforced by (protected) layout). */
export default async function UserSettingsPage() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isDevAuthBypassEnabled()) {
    redirect(await buildLoginRedirectUrl(riskaiPath("/settings")));
  }

  const legacyDocumentPadding = !RISKAI_ENABLE_APP_SHELL;

  if (!user) {
    return (
      <AccountSettingsPage legacyDocumentPadding={legacyDocumentPadding}>
        <AccountSettingsHeader description="Your account details." />
        <AccountSettingsTabs
          tabs={[
            {
              id: "profile",
              label: "Profile",
              panel: (
                <>
                  <p className="mb-6 rounded-[var(--ds-radius-md)] border border-[var(--ds-status-warning-border)] bg-[var(--ds-status-warning-subtle-bg)] px-3 py-2 text-sm text-[var(--ds-status-warning-fg)]">
                    <span className="font-medium">Dev preview:</span> sign in to use profile, delete account, and
                    sign out.
                  </p>
                  <section className="mb-10">
                    <div className="space-y-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] p-4 text-sm text-[var(--ds-text-muted)]">
                      <p>Form hidden — no session.</p>
                    </div>
                  </section>
                </>
              ),
            },
            {
              id: "apps",
              label: "Apps",
              panel: (
                <p className="mb-10 text-sm text-[var(--ds-text-muted)]">
                  Sign in to see Visualify apps enabled through your workspaces.
                </p>
              ),
            },
            {
              id: "authentication",
              label: "Authentication",
              panel: (
                <p className="mb-10 text-sm text-[var(--ds-text-muted)]">
                  Sign in to manage password, two-factor authentication, and session options.
                </p>
              ),
            },
            {
              id: "danger",
              label: "Danger Zone",
              panel: (
                <p className="mb-10 text-sm text-[var(--ds-text-muted)]">
                  Sign in to review account deletion options.
                </p>
              ),
            },
          ]}
        />
        <Link
          href={riskaiPath("/portfolios")}
          className="inline-flex rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] px-4 py-2 text-sm font-medium text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-hover)]"
        >
          ← Back to portfolios
        </Link>
      </AccountSettingsPage>
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

  const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
  const totpAlreadyEnabled = listFactorsIndicatesVerifiedTotp(mfaFactors ?? null);

  const firstName = profileRow?.first_name ?? (meta?.first_name as string | undefined) ?? null;
  const lastName = profileRow?.surname ?? (meta?.last_name as string | undefined) ?? null;
  const company = profileRow?.company ?? (meta?.company as string | undefined) ?? null;
  const role = profileRow?.role ?? (meta?.role as string | undefined) ?? null;
  const workspaceEntitledProductKeys = await fetchWorkspaceEntitledProductKeysForUser(supabase, user.id);

  return (
    <AccountSettingsPage legacyDocumentPadding={legacyDocumentPadding}>
      <AccountSettingsSignedIn
        email={user.email ?? null}
        userId={user.id}
        firstName={firstName}
        lastName={lastName}
        company={company}
        role={role}
        workspaceEntitledProductKeys={workspaceEntitledProductKeys}
        totpAlreadyEnabled={totpAlreadyEnabled}
        sessionUpdatedAt={sessionRow?.updated_at ?? null}
        sessionLastSeenAt={sessionRow?.last_seen_at ?? null}
        sessionUserAgent={sessionRow?.user_agent ?? null}
      />
    </AccountSettingsPage>
  );
}
