"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** Report app-shell providers (Help & Feedback in rail footer). */
export function ReportAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="report-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
