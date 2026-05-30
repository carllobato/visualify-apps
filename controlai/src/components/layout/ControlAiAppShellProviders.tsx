"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** ControlAI app-shell providers (Help & Feedback in rail footer). */
export function ControlAiAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="controlai-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
