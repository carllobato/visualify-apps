"use client";

import type { ReactNode } from "react";
import {
  AppShellRail,
  AppShellRailBody,
  AppShellRailFooter,
  AppShellRailHeader,
} from "../AppShellRail";
import { AppLoginBrandMark } from "./AppLoginBrandMark";
import { appShellRailIconWellClassName, railBrandTitleClass } from "../rail-row-classes";
import {
  appShellRailMobileOpenFlexRevealClassName,
  appShellRailMobileOpenRowGapClassName,
} from "../rail-mobile-classes";

export type AppLoginFramedSignedInRailProps = {
  children: ReactNode;
  brandHref: string;
  brandTitle: string;
  brandAriaLabel: string;
  brandMarkSrc?: string;
  /** When set, pin state is persisted (same key as the product’s signed-in rail). */
  pinnedStorageKey?: string;
};

/**
 * Collapsible platform rail for post-auth framed gates (workspace selection).
 * Reuses {@link AppShellRail} so pin/open, Help, and account share signed-in behaviour.
 */
export function AppLoginFramedSignedInRail({
  children,
  brandHref,
  brandTitle,
  brandAriaLabel,
  brandMarkSrc,
  pinnedStorageKey,
}: AppLoginFramedSignedInRailProps) {
  return (
    <AppShellRail ariaLabel="Visualify platform" pinnedStorageKey={pinnedStorageKey}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <a
            href={brandHref}
            title={brandTitle}
            aria-label={brandAriaLabel}
            className={
              "vf-app-shell-rail-expand-row relative flex h-10 w-full min-w-0 shrink-0 items-center gap-0 rounded-[var(--ds-radius-md)] no-underline " +
              "transition-[gap] duration-[400ms] ease-out group-data-[pinned=true]:gap-2 " +
              appShellRailMobileOpenRowGapClassName +
              " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]"
            }
          >
            <span className={appShellRailIconWellClassName}>
              <AppLoginBrandMark src={brandMarkSrc} alt="" variant="rail" />
            </span>
            <span
              className={
                `hidden vf-app-shell-rail-expand-flex min-w-0 flex-1 overflow-hidden ${railBrandTitleClass} ` +
                "group-data-[pinned=true]:flex " +
                appShellRailMobileOpenFlexRevealClassName
              }
            >
              <span className="min-w-0 flex-1 truncate text-[var(--ds-text-primary)]">{brandTitle}</span>
            </span>
          </a>
        </AppShellRailHeader>
        <AppShellRailFooter pinCollapse>{children}</AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
