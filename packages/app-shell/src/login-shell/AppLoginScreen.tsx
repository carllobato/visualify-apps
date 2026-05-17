import type { ReactNode } from "react";
import { AppLoginFramedShell } from "./AppLoginFramedShell";
import type { AppLoginFramedShellProps } from "./AppLoginFramedShell";
import { AppLoginPage } from "./AppLoginPage";
import type { AppLoginCopyrightProps } from "./AppLoginCopyright";

export type AppLoginScreenProps = {
  children: ReactNode;
} & Pick<AppLoginFramedShellProps, "brandHref" | "brandTitle" | "brandAriaLabel" | "brandMarkSrc"> &
  AppLoginCopyrightProps;

/**
 * **Canonical login route shell** — use this on every product sign-in/sign-up page.
 *
 * Composes {@link AppLoginFramedShell} + {@link AppLoginPage} (centered column + copyright).
 * Do not reassemble those primitives in apps; do not fork a local “login shell” wrapper.
 *
 * **Recommended children:** {@link AppLoginCardSuspense} wrapping an app-owned client form
 * (`AppLoginCardHeader`, tabs, fields, {@link AppLoginSubmitRow}, etc.).
 *
 * **Customize via props only:** `brandHref`, `brandTitle`, `brandAriaLabel`, `brandMarkSrc`,
 * `copyrightHolder`, `year`.
 *
 * @see ./LOGIN_ARCHITECTURE.md
 */
export function AppLoginScreen({
  children,
  brandHref,
  brandTitle,
  brandAriaLabel,
  brandMarkSrc,
  copyrightHolder,
  year,
}: AppLoginScreenProps) {
  return (
    <AppLoginFramedShell
      brandHref={brandHref}
      brandTitle={brandTitle}
      brandAriaLabel={brandAriaLabel}
      brandMarkSrc={brandMarkSrc}
    >
      <AppLoginPage copyrightHolder={copyrightHolder} year={year}>
        {children}
      </AppLoginPage>
    </AppLoginFramedShell>
  );
}
