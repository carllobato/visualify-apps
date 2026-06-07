"use client";

import type { ReactNode } from "react";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileHeader,
  AppShellRailBrandMark,
  AppShellScrollRegion,
} from "@visualify/app-shell";

export function TemplateProtectedDocument({ children }: { children: ReactNode }) {
  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        appName="Template"
        pageTitle="Dashboard"
        appIcon={<AppShellRailBrandMark alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
    </AppShellMainColumn>
  );
}
