"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AppShellHelpFeedbackModal,
  useAppShellHelpFeedbackConfig,
} from "@visualify/app-shell";
import { getReportHqAccountSettingsUrl } from "@/lib/report-hq-urls";
import { REPORT_ROUTES } from "@/lib/report-routes";
import "./report-mobile-more-sheet.css";

type ReportMobileMoreSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function ReportMobileMoreSheet({ open, onClose }: ReportMobileMoreSheetProps) {
  const helpConfig = useAppShellHelpFeedbackConfig();
  const [helpOpen, setHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const sheet =
    mounted && open
      ? createPortal(
          <>
            <button
              type="button"
              className="report-mobile-more-sheet__backdrop"
              aria-label="Close menu"
              onClick={onClose}
            />
            <div className="report-mobile-more-sheet" role="menu" aria-label="More options">
              <ul className="report-mobile-more-sheet__list">
                <li>
                  <Link
                    href={REPORT_ROUTES.home}
                    role="menuitem"
                    className="report-mobile-more-sheet__item ds-app-menu-dropdown__item block"
                    onClick={onClose}
                  >
                    Change workspace
                  </Link>
                </li>
                <li>
                  <a
                    href={getReportHqAccountSettingsUrl()}
                    role="menuitem"
                    className="report-mobile-more-sheet__item ds-app-menu-dropdown__item block"
                    onClick={onClose}
                  >
                    Account settings
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="report-mobile-more-sheet__item ds-app-menu-dropdown__item"
                    onClick={() => {
                      onClose();
                      setHelpOpen(true);
                    }}
                  >
                    Help &amp; feedback
                  </button>
                </li>
              </ul>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {sheet}
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
