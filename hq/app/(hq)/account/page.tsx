import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  displayProfileFieldsFromSources,
  fetchVisualifyProfileRow,
} from "@/lib/visualify-profile-data";
import {
  AccountSettingsPage as AccountSettingsPageShell,
  listFactorsIndicatesVerifiedTotp,
} from "@visualify/app-shell";
import { supabaseServerClient } from "@/lib/supabase/server";
import { fetchWorkspaceEntitledProductKeysForUser } from "@visualify/workspace-product-access";
import { AccountSettingsClient } from "./account-settings-client";

export const dynamic = "force-dynamic";

/**
 * Account settings are identity-only (profile, password, session). App availability is workspace-scoped;
 * the Apps tab reflects live workspace membership + subscriptions via the server client (RLS).
 */
export default async function AccountSettingsPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const supabase = await supabaseServerClient();
  const profileRow = await fetchVisualifyProfileRow(supabase, user.id);
  const { firstName, lastName, company, role } = displayProfileFieldsFromSources(profileRow, meta);
  const workspaceEntitledProductKeys = await fetchWorkspaceEntitledProductKeysForUser(supabase, user.id);

  const { data: sessionRow, error: sessionError } = await supabase
    .from("visualify_user_sessions")
    .select("updated_at, last_seen_at, user_agent")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: mfaFactors, error: mfaError } = await supabase.auth.mfa.listFactors();
  const totpAlreadyEnabled = mfaError
    ? false
    : listFactorsIndicatesVerifiedTotp(mfaFactors ?? null);

  return (
      <AccountSettingsPageShell>
        <AccountSettingsClient
          email={user.email ?? null}
          userId={user.id}
          firstName={firstName}
          lastName={lastName}
          company={company}
          role={role}
          workspaceEntitledProductKeys={workspaceEntitledProductKeys}
          totpAlreadyEnabled={totpAlreadyEnabled}
          sessionUpdatedAt={sessionError ? null : (sessionRow?.updated_at ?? null)}
          sessionLastSeenAt={sessionError ? null : (sessionRow?.last_seen_at ?? null)}
          sessionUserAgent={sessionError ? null : (sessionRow?.user_agent ?? null)}
        />
      </AccountSettingsPageShell>
  );
}
