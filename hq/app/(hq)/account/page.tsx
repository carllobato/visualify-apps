import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  displayProfileFieldsFromSources,
  fetchVisualifyProfileRow,
} from "@/lib/visualify-profile-data";
import { supabaseServerClient } from "@/lib/supabase/server";
import { fetchWorkspaceEntitledProductKeysForUser } from "@/lib/workspace-entitlements-for-account";
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

  return (
      <main className="w-full min-w-0 shrink-0 px-0 pb-4">
        <AccountSettingsClient
          email={user.email ?? null}
          userId={user.id}
          firstName={firstName}
          lastName={lastName}
          company={company}
          role={role}
          workspaceEntitledProductKeys={workspaceEntitledProductKeys}
        />
      </main>
  );
}
