"use client";

import {
  AccountSettingsAppsPanel,
  AccountSettingsAuthenticationPanel,
  AccountSettingsHeader,
  AccountSettingsTabs,
  AppShellDeleteAccountSection,
  useAccountSettingsProfilePanel,
} from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function AccountSettingsClient(props: {
  email: string | null;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  role: string | null;
  /** Product keys (`visualify_products.key`) the user may open via workspace membership + workspace subscriptions. */
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
            panel: <AccountSettingsAppsPanel workspaceEntitledProductKeys={workspaceEntitledProductKeys} />,
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
                  redirectTo: "/login",
                  useGlobalScopeFallback: true,
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
            panel: (
              <AppShellDeleteAccountSection
                redirectAfterDelete="/login"
                getSupabaseClient={getSupabaseClient}
                authDisabledMessage="Account deletion is disabled while HQ_AUTH_DISABLED / NEXT_PUBLIC_HQ_AUTH_DISABLED is set."
              />
            ),
          },
        ]}
      />
    </>
  );
}
