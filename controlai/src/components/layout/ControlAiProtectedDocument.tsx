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

export function ControlAiProtectedDocument({ children }: { children: ReactNode }) {
  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        appName="ControlAI"
        pageTitle="ControlAI"
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
