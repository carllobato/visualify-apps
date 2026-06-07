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
import { isAuthDisabled } from "@/lib/auth/auth-disabled";
import { HQ_ROUTES } from "@/lib/hq-routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type HqMobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
};

async function signOutFromHq(): Promise<void> {
  if (isAuthDisabled()) {
    window.location.assign(HQ_ROUTES.dashboard);
    return;
  }
  try {
    const res = await fetch("/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      await supabaseBrowserClient().auth.signOut({ scope: "global" });
    }
  } catch {
    await supabaseBrowserClient().auth.signOut({ scope: "global" });
  } finally {
    window.location.assign("/login");
  }
}

export function HqMobileMoreSheet({ open, onClose }: HqMobileMoreSheetProps) {
  const helpConfig = useAppShellHelpFeedbackConfig();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <AppShellMobileMoreSheet open={open} onClose={onClose}>
        <AppShellMobileMoreSheetList>
          <AppShellMobileMoreSheetListItem>
            <Link
              href={HQ_ROUTES.account}
              role="menuitem"
              className={`${appShellMobileMoreSheetItemClassName} block`}
              onClick={onClose}
            >
              User settings
            </Link>
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
                void signOutFromHq();
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
