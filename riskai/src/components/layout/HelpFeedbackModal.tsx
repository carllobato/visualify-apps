"use client";

import { AppShellHelpFeedbackModal } from "@visualify/app-shell";
import type { AppShellHelpFeedbackModalProps } from "@visualify/app-shell";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type HelpFeedbackModalProps = Pick<AppShellHelpFeedbackModalProps, "open" | "onClose">;

/** RiskAI Help & Feedback modal — shared shell implementation with RiskAI contact source. */
export function HelpFeedbackModal({ open, onClose }: HelpFeedbackModalProps) {
  return (
    <AppShellHelpFeedbackModal
      open={open}
      onClose={onClose}
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
