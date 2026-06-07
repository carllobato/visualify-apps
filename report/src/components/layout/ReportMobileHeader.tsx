"use client";

import Link from "next/link";
import {
  AppShellMobileHeader,
  AppShellRailBrandMark,
  appShellMobileShellHeaderClassName,
} from "@visualify/app-shell";
import { REPORT_ROUTES } from "@/lib/report-routes";
import "./report-mobile-shell.css";

/**
 * Report mobile top bar — brand mark + "Report" linking to `/home`, no route page title.
 *
 * Uses {@link AppShellMobileHeader} for presence registration (scroll insets, rail drawer).
 * `appIdentity` is required because identity must be a Next.js `Link`; app-shell stays
 * framework-agnostic and does not import `next/link`.
 */
export function ReportMobileHeader() {
  return (
    <AppShellMobileHeader
      className={appShellMobileShellHeaderClassName}
      appName="Report"
      showMenuTrigger={false}
      appIdentity={
        <Link
          href={REPORT_ROUTES.home}
          className="report-mobile-header__identity-link vf-app-shell-mobile-header__identity"
        >
          <span className="vf-app-shell-mobile-header__icon" aria-hidden>
            <AppShellRailBrandMark alt="" />
          </span>
          <div className="vf-app-shell-mobile-header__titles">
            <span className="vf-app-shell-mobile-header__app-name">Report</span>
          </div>
        </Link>
      }
    />
  );
}
