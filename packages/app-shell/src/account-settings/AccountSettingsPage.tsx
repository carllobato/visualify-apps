import type { ReactNode } from "react";
import { AppShellLegalFooterWithModals } from "../legal/AppShellLegalFooterWithModals";
import {
  accountSettingsPageLegacyPaddingClassName,
  accountSettingsPageShellClassName,
} from "./classes";
import { mergeClass } from "./merge-class";

export type AccountSettingsPageProps = {
  children: ReactNode;
  className?: string;
  /**
   * When true, applies document padding for layouts without `AppShellScrollRegion` horizontal inset
   * (e.g. RiskAI legacy TopNav shell).
   */
  legacyDocumentPadding?: boolean;
};

export function AccountSettingsPage({
  children,
  className,
  legacyDocumentPadding = false,
}: AccountSettingsPageProps) {
  const base = legacyDocumentPadding
    ? accountSettingsPageLegacyPaddingClassName
    : accountSettingsPageShellClassName;

  return (
    <main className={mergeClass(mergeClass("flex min-h-full min-w-0 flex-col", base), className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <AppShellLegalFooterWithModals className="mt-8" />
    </main>
  );
}
