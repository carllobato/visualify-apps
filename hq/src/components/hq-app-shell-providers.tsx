"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { authDisabledStubUser, isAuthDisabled } from "@/lib/auth/auth-disabled";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** HQ app-shell providers (Help & Feedback in rail footer). */
export function HqAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="hq-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
      getSignedInUser={async () => {
        if (isAuthDisabled()) {
          return authDisabledStubUser();
        }
        const {
          data: { user },
        } = await supabaseBrowserClient().auth.getUser();
        return user;
      }}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
