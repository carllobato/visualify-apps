import type { ReactNode } from "react";
import { appLoginPageMainClassName } from "./classes";
import { AppLoginCopyright } from "./AppLoginCopyright";
import type { AppLoginCopyrightProps } from "./AppLoginCopyright";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginPageProps = {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
} & AppLoginCopyrightProps;

/**
 * Centered login column: main content slot (typically {@link AppLoginCard} + form) and copyright below.
 */
export function AppLoginPage({
  children,
  className,
  mainClassName,
  copyrightHolder,
  year,
}: AppLoginPageProps) {
  return (
    <main className={mergeClass(mergeClass(appLoginPageMainClassName, mainClassName), className)}>
      {children}
      <AppLoginCopyright copyrightHolder={copyrightHolder} year={year} />
    </main>
  );
}
