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

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

export function ControlAiProtectedDocument({ children }: { children: ReactNode }) {
  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        appName="ControlAI"
        pageTitle="ControlAI"
        appIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
    </AppShellMainColumn>
  );
}
