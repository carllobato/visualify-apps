import { redirect } from "next/navigation";
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-authenticated-user";
import {
  displayProfileFieldsFromSources,
  fetchVisualifyProfileRow,
} from "@/lib/visualify-profile-data";
import { supabaseServerClient } from "@/lib/supabase/server";
import { AccountSettingsClient } from "./account-settings-client";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await resolveAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const supabase = await supabaseServerClient();
  const profileRow = await fetchVisualifyProfileRow(supabase, user.id);
  const { firstName, lastName, company, role } = displayProfileFieldsFromSources(profileRow, meta);

  return (
      <main className="w-full min-w-0 shrink-0 px-0 pb-4">
        <AccountSettingsClient
          email={user.email ?? null}
          userId={user.id}
          firstName={firstName}
          lastName={lastName}
          company={company}
          role={role}
          grantedAppIds={["riskai"]}
        />
      </main>
  );
}
