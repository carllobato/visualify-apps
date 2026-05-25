"use client";

import {
  AccountSettingsAppsPanel,
  AccountSettingsAuthenticationPanel,
  AccountSettingsHeader,
  AccountSettingsTabs,
  useAccountSettingsProfilePanel,
} from "@visualify/app-shell";
import { ACCOUNT_PROFILE_UPDATED_EVENT } from "@/lib/onboarding/types";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { AccountDeletePanel } from "./account-security-panels";

export function AccountSettingsSignedIn(props: {
  email: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  workspaceEntitledProductKeys: readonly string[];
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
    workspaceEntitledProductKeys,
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
    onProfileSaved: () => {
      window.dispatchEvent(new CustomEvent(ACCOUNT_PROFILE_UPDATED_EVENT));
    },
  });

  return (
    <>
      <AccountSettingsHeader actions={profile.headerActions} />

      <AccountSettingsTabs
        tabs={[
          {
            id: "profile",
            label: "Profile",
            panel: profile.panel,
          },
          {
            id: "apps",
            label: "Apps",
            panel: (
              <AccountSettingsAppsPanel
                workspaceEntitledProductKeys={workspaceEntitledProductKeys}
                userEmail={email}
              />
            ),
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
                }}
                signOutEverywhere={{
                  redirectTo: "/login",
                }}
              />
            ),
          },
          {
            id: "danger",
            label: "Danger Zone",
            panel: <AccountDeletePanel />,
          },
        ]}
      />
    </>
  );
}
