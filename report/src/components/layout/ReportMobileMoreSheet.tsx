"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AppShellHelpFeedbackModal,
  AppShellMobileMoreSheet,
  AppShellMobileMoreSheetList,
  AppShellMobileMoreSheetListItem,
  appShellMobileMoreSheetItemClassName,
  useAppShellHelpFeedbackConfig,
} from "@visualify/app-shell";
import { getReportHqAccountSettingsUrl } from "@/lib/report-hq-urls";
import { REPORT_ROUTES } from "@/lib/report-routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type ReportMobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
};

async function signOutFromReport(): Promise<void> {
  try {
    const res = await fetch("/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      await supabaseBrowserClient().auth.signOut();
    }
  } catch {
    await supabaseBrowserClient().auth.signOut();
  } finally {
    window.location.href = "/";
  }
}

export function ReportMobileMoreSheet({ open, onClose }: ReportMobileMoreSheetProps) {
  const helpConfig = useAppShellHelpFeedbackConfig();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <AppShellMobileMoreSheet open={open} onClose={onClose}>
        <AppShellMobileMoreSheetList>
          <AppShellMobileMoreSheetListItem>
            <Link
              href={REPORT_ROUTES.home}
              role="menuitem"
              className={`${appShellMobileMoreSheetItemClassName} block`}
              onClick={onClose}
            >
              Change workspace
            </Link>
          </AppShellMobileMoreSheetListItem>
          <AppShellMobileMoreSheetListItem>
            <a
              href={getReportHqAccountSettingsUrl()}
              role="menuitem"
              className={`${appShellMobileMoreSheetItemClassName} block`}
              onClick={onClose}
            >
              Account settings
            </a>
          </AppShellMobileMoreSheetListItem>
          <AppShellMobileMoreSheetListItem>
            <button
              type="button"
              role="menuitem"
              className={appShellMobileMoreSheetItemClassName}
              onClick={() => {
                onClose();
                setHelpOpen(true);
              }}
            >
              Help &amp; feedback
            </button>
          </AppShellMobileMoreSheetListItem>
          <AppShellMobileMoreSheetListItem>
            <button
              type="button"
              role="menuitem"
              className={appShellMobileMoreSheetItemClassName}
              onClick={() => {
                onClose();
                void signOutFromReport();
              }}
            >
              Sign out
            </button>
          </AppShellMobileMoreSheetListItem>
        </AppShellMobileMoreSheetList>
      </AppShellMobileMoreSheet>
      {helpConfig ? (
        <AppShellHelpFeedbackModal
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          source={helpConfig.source}
          getSignedInUser={helpConfig.getSignedInUser}
          contactApiPath={helpConfig.contactApiPath}
        />
      ) : null}
    </>
  );
}
