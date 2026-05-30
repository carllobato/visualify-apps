"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** RiskAI app-shell providers (Help & Feedback in rail footer). */
export function RiskAiAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="riskai-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
