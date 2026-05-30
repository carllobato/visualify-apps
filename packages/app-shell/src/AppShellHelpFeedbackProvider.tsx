"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { AppShellSupabaseAuthClient } from "./account-security/types";
import type { AppShellHelpFeedbackUser } from "./AppShellHelpFeedbackModal";
import type { AppShellRailHelpFeedbackProps } from "./AppShellRailHelpFeedback";

type AppShellHelpFeedbackConfig = Pick<
  AppShellRailHelpFeedbackProps,
  "source" | "getSignedInUser" | "contactApiPath" | "label"
>;

const AppShellHelpFeedbackContext = createContext<AppShellHelpFeedbackConfig | null>(null);

export type AppShellHelpFeedbackProviderProps = AppShellHelpFeedbackConfig & {
  children: ReactNode;
};

/**
 * Mount once at the app root. {@link AppShellRailFooter} renders Help & Feedback automatically
 * when this provider is present.
 */
export function AppShellHelpFeedbackProvider({
  source,
  getSignedInUser,
  contactApiPath,
  label,
  children,
}: AppShellHelpFeedbackProviderProps) {
  const value = useMemo(
    () => ({ source, getSignedInUser, contactApiPath, label }),
    [source, getSignedInUser, contactApiPath, label],
  );

  return (
    <AppShellHelpFeedbackContext.Provider value={value}>{children}</AppShellHelpFeedbackContext.Provider>
  );
}

/** Returns rail footer Help config when {@link AppShellHelpFeedbackProvider} is mounted. */
export function useAppShellHelpFeedbackConfig(): AppShellHelpFeedbackConfig | null {
  return useContext(AppShellHelpFeedbackContext);
}

export type AppShellHelpFeedbackSupabaseProviderProps = {
  /** Stored on `visualify_contact.source` (e.g. `controlai-help-modal`). */
  source: string;
  getSupabaseClient: () => AppShellSupabaseAuthClient;
  /** Override default Supabase `auth.getUser()` resolution. */
  getSignedInUser?: () => Promise<AppShellHelpFeedbackUser | null>;
  contactApiPath?: string;
  label?: string;
  children: ReactNode;
};

/** Convenience provider that resolves the signed-in user from a Supabase browser client. */
export function AppShellHelpFeedbackSupabaseProvider({
  source,
  getSupabaseClient,
  getSignedInUser,
  contactApiPath,
  label,
  children,
}: AppShellHelpFeedbackSupabaseProviderProps) {
  const resolveUser =
    getSignedInUser ??
    (async () => {
      const {
        data: { user },
      } = await getSupabaseClient().auth.getUser();
      return user;
    });

  return (
    <AppShellHelpFeedbackProvider
      source={source}
      getSignedInUser={resolveUser}
      contactApiPath={contactApiPath}
      label={label}
    >
      {children}
    </AppShellHelpFeedbackProvider>
  );
}
