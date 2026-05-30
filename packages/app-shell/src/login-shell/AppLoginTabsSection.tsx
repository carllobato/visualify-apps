import type { ReactNode } from "react";
import { appLoginTabsDividerClassName, appLoginTabsRowClassName, appLoginTabsSectionClassName } from "./classes";

export type AppLoginTabsSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Sign in / Sign up tab row + divider (shared across product login cards). */
export function AppLoginTabsSection({ children, className }: AppLoginTabsSectionProps) {
  return (
    <div className={className ?? appLoginTabsSectionClassName}>
      <div className={appLoginTabsRowClassName}>{children}</div>
      <div className={appLoginTabsDividerClassName} aria-hidden />
    </div>
  );
}
