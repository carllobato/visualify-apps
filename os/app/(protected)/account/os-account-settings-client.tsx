"use client";

import {
  AccountSettingsAuthenticationPanel,
  AccountSettingsHeader,
  AccountSettingsTabs,
  useAccountSettingsProfilePanel,
} from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function OsAccountSettingsClient(props: {
  email: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  totpAlreadyEnabled: boolean;
  sessionUpdatedAt: string | null;
  sessionLastSeenAt: string | null;
  sessionUserAgent: string | null;
}) {
  const {
    email,
    userId,
    firstName,
    lastName,
    company,
    role,
    totpAlreadyEnabled,
    sessionUpdatedAt,
    sessionLastSeenAt,
    sessionUserAgent,
  } = props;

  const getSupabaseClient = () => supabaseBrowserClient();

  const profile = useAccountSettingsProfilePanel({
    email,
    userId,
    firstName,
    lastName,
    company,
    role,
  });

  return (
    <>
      <AccountSettingsHeader
        description="Profile and authentication for your Visualify OS account."
        actions={profile.headerActions}
      />

      <AccountSettingsTabs
        tabs={[
          {
            id: "profile",
            label: "Profile",
            panel: profile.panel,
          },
          {
            id: "authentication",
            label: "Authentication",
            panel: (
              <AccountSettingsAuthenticationPanel
                getSupabaseClient={getSupabaseClient}
                totpAlreadyEnabled={totpAlreadyEnabled}
                sessionUpdatedAt={sessionUpdatedAt}
                sessionLastSeenAt={sessionLastSeenAt}
                sessionUserAgent={sessionUserAgent}
                signOut={{
                  redirectTo: "/",
                  signOutRoute: "/auth/sign-out",
                }}
                signOutEverywhere={{ redirectTo: "/login" }}
                showSignOutEverywhere={false}
              />
            ),
          },
        ]}
      />
    </>
  );
}
