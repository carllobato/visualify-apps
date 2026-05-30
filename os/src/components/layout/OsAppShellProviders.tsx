"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** OS app-shell providers (Help & Feedback in rail footer). */
export function OsAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="os-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
