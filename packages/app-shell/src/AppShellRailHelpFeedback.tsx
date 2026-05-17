"use client";

import { useState } from "react";
import { AppShellHelpFeedbackModal } from "./AppShellHelpFeedbackModal";
import type { AppShellHelpFeedbackModalProps } from "./AppShellHelpFeedbackModal";
import { AppShellRailFooterHelp, AppShellRailFooterHelpTrigger } from "./AppShellRailFooterHelp";

export type AppShellRailHelpFeedbackProps = Pick<
  AppShellHelpFeedbackModalProps,
  "source" | "getSignedInUser" | "contactApiPath"
> & {
  label?: string;
};

/**
 * Standard rail footer Help: visible control above the account row + Help & Feedback modal.
 */
export function AppShellRailHelpFeedback({
  source,
  getSignedInUser,
  contactApiPath,
  label,
}: AppShellRailHelpFeedbackProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppShellRailFooterHelp>
        <AppShellRailFooterHelpTrigger onClick={() => setOpen(true)} label={label} />
      </AppShellRailFooterHelp>
      <AppShellHelpFeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        source={source}
        getSignedInUser={getSignedInUser}
        contactApiPath={contactApiPath}
      />
    </>
  );
}
