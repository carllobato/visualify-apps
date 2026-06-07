"use client";

import Link from "next/link";
import {
  AppShellMobileHeader,
  AppShellRailBrandMark,
  appShellMobileShellHeaderClassName,
} from "@visualify/app-shell";
import { HQ_ROUTES } from "@/lib/hq-routes";
import "./hq-mobile-shell.css";

/**
 * HQ mobile top bar — brand mark + "HQ" linking to `/dashboard`, no route page title.
 *
 * Uses {@link AppShellMobileHeader} for presence registration (scroll insets, rail drawer).
 * `appIdentity` is required because identity must be a Next.js `Link`; app-shell stays
 * framework-agnostic and does not import `next/link`.
 */
export function HqMobileHeader() {
  return (
    <AppShellMobileHeader
      className={appShellMobileShellHeaderClassName}
      appName="HQ"
      showMenuTrigger={false}
      appIdentity={
        <Link
          href={HQ_ROUTES.dashboard}
          className="hq-mobile-header__identity-link vf-app-shell-mobile-header__identity"
        >
          <span className="vf-app-shell-mobile-header__icon" aria-hidden>
            <AppShellRailBrandMark alt="" />
          </span>
          <div className="vf-app-shell-mobile-header__titles">
            <span className="vf-app-shell-mobile-header__app-name">HQ</span>
          </div>
        </Link>
      }
    />
  );
}
