"use client";

import type { ReactNode } from "react";
import { AppShellChangePasswordForm } from "../AppShellChangePasswordForm";
import { AppShellLastLoginPanel } from "../AppShellLastLoginPanel";
import { AppShellSignOutButton } from "../AppShellSignOutButton";
import { AppShellSignOutEverywhereButton } from "../AppShellSignOutEverywhereButton";
import { AppShellTwoFactorSetup } from "../AppShellTwoFactorSetup";
import type { AppShellSupabaseAuthClient } from "../account-security/types";
import {
  AccountSettingsCard,
  AccountSettingsCardContent,
  AccountSettingsCardFooter,
  AccountSettingsCardHeader,
} from "./AccountSettingsCard";
import { accountSettingsIntroTextClassName, accountSettingsPanelSectionClassName } from "./classes";

const DEFAULT_PASSWORD_INTRO =
  "Use a strong password you don\u2019t use elsewhere. You\u2019ll need your current password to confirm.";

const DEFAULT_TWO_FACTOR_INTRO = "Add an authenticator app for extra account security.";

export type AccountSettingsSignOutConfig = {
  redirectTo: string;
  signOutRoute?: string;
  useGlobalScopeFallback?: boolean;
};

export type AccountSettingsSignOutEverywhereConfig = {
  redirectTo: string;
  apiPath?: string;
};

export type AccountSettingsAuthenticationPanelProps = {
  getSupabaseClient: () => AppShellSupabaseAuthClient;
  totpAlreadyEnabled: boolean;
  sessionUpdatedAt: string | null;
  sessionLastSeenAt: string | null;
  sessionUserAgent: string | null;
  signOut: AccountSettingsSignOutConfig;
  signOutEverywhere: AccountSettingsSignOutEverywhereConfig;
  showSignOutEverywhere?: boolean;
  passwordIntro?: ReactNode;
  twoFactorIntro?: ReactNode;
};

export function AccountSettingsAuthenticationPanel({
  getSupabaseClient,
  totpAlreadyEnabled,
  sessionUpdatedAt,
  sessionLastSeenAt,
  sessionUserAgent,
  signOut,
  signOutEverywhere,
  showSignOutEverywhere = true,
  passwordIntro = DEFAULT_PASSWORD_INTRO,
  twoFactorIntro = DEFAULT_TWO_FACTOR_INTRO,
}: AccountSettingsAuthenticationPanelProps) {
  return (
    <section className={accountSettingsPanelSectionClassName}>
      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Password" />
        <AccountSettingsCardContent>
          <p className={accountSettingsIntroTextClassName}>{passwordIntro}</p>
          <AppShellChangePasswordForm getSupabaseClient={getSupabaseClient} />
        </AccountSettingsCardContent>
      </AccountSettingsCard>

      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Two-Factor Authentication" />
        <AccountSettingsCardContent>
          <p className={accountSettingsIntroTextClassName}>{twoFactorIntro}</p>
          <AppShellTwoFactorSetup
            totpAlreadyEnabled={totpAlreadyEnabled}
            getSupabaseClient={getSupabaseClient}
          />
        </AccountSettingsCardContent>
      </AccountSettingsCard>

      <AccountSettingsCard>
        <AccountSettingsCardHeader title="Session & security" />
        <AccountSettingsCardContent>
          <AppShellLastLoginPanel
            updatedAt={sessionUpdatedAt}
            lastSeenAt={sessionLastSeenAt}
            userAgent={sessionUserAgent}
          />
        </AccountSettingsCardContent>
        <AccountSettingsCardFooter>
          <div className="flex flex-wrap items-start gap-3">
            <AppShellSignOutButton
              redirectTo={signOut.redirectTo}
              signOutRoute={signOut.signOutRoute}
              getSupabaseClient={getSupabaseClient}
              useGlobalScopeFallback={signOut.useGlobalScopeFallback}
            />
            {showSignOutEverywhere ? (
              <AppShellSignOutEverywhereButton
                redirectTo={signOutEverywhere.redirectTo}
                apiPath={signOutEverywhere.apiPath}
                getSupabaseClient={getSupabaseClient}
              />
            ) : null}
          </div>
        </AccountSettingsCardFooter>
      </AccountSettingsCard>
    </section>
  );
}
