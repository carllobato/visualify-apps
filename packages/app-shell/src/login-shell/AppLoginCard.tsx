import type { ReactNode } from "react";
import { Card } from "@visualify/design-system";
import { appLoginCardClassName, appLoginCardContentClassName } from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginCardProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Low-level elevated card surface for login content.
 *
 * **Login routes:** use {@link AppLoginCardSuspense} instead — do not import this on
 * `page.tsx` or wrap forms with `AppLoginCard` + local `Suspense`.
 *
 * @internal Preferred entry for apps is {@link AppLoginCardSuspense}.
 * @see ./LOGIN_ARCHITECTURE.md
 */
export function AppLoginCard({ children, className, contentClassName }: AppLoginCardProps) {
  return (
    <Card variant="default" className={mergeClass(appLoginCardClassName, className)}>
      <div className={mergeClass(appLoginCardContentClassName, contentClassName)}>{children}</div>
    </Card>
  );
}
