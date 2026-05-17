"use client";

import { AppShellDeleteAccountSection } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export function AccountDeletePanel() {
  return (
    <AppShellDeleteAccountSection
      redirectAfterDelete="/"
      getSupabaseClient={() => supabaseBrowserClient()}
    />
  );
}
