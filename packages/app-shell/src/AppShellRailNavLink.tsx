"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { appShellRailNavRowClass } from "./rail-footer-row-classes";
import {
  appShellRailIconWellClassName,
  appShellRailNavIconSlotClassName,
  railLabelClass,
} from "./rail-row-classes";

export type AppShellRailNavLinkProps = {
  href: string;
  label: string;
  active: boolean;
  children: ReactNode;
};

/** Primary rail nav link — 40px row, 25px icon slot, shared gap/spacing with entity rows. */
export function AppShellRailNavLink({ href, label, active, children }: AppShellRailNavLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={appShellRailNavRowClass(active)}
    >
      <span className={appShellRailIconWellClassName}>
        <span className={appShellRailNavIconSlotClassName}>{children}</span>
      </span>
      <span className={railLabelClass}>{label}</span>
    </Link>
  );
}
