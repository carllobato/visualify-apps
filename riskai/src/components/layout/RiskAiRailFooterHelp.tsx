"use client";

import { AppShellRailHelpFeedback } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** RiskAI rail footer Help & Feedback (issue / feature / question modal). */
export function RiskAiRailFooterHelp() {
  return (
    <AppShellRailHelpFeedback
      source="riskai-help-modal"
      getSignedInUser={async () => {
        const {
          data: { user },
        } = await supabaseBrowserClient().auth.getUser();
        return user;
      }}
    />
  );
}
