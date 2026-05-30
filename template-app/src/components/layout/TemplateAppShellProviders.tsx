"use client";

import { AppShellHelpFeedbackSupabaseProvider } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** Template App app-shell providers (Help & Feedback in rail footer). */
export function TemplateAppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppShellHelpFeedbackSupabaseProvider
      source="template-app-help-modal"
      getSupabaseClient={() => supabaseBrowserClient()}
    >
      {children}
    </AppShellHelpFeedbackSupabaseProvider>
  );
}
