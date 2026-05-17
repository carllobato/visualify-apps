"use client";

import { AppShellRailHelpFeedback } from "@visualify/app-shell";
import { authDisabledStubUser, isAuthDisabled } from "@/lib/auth/auth-disabled";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/** HQ rail footer Help & Feedback (issue / feature / question modal). */
export function HqRailFooterHelp() {
  return (
    <AppShellRailHelpFeedback
      source="hq-help-modal"
      getSignedInUser={async () => {
        if (isAuthDisabled()) {
          return authDisabledStubUser();
        }
        const {
          data: { user },
        } = await supabaseBrowserClient().auth.getUser();
        return user;
      }}
    />
  );
}
