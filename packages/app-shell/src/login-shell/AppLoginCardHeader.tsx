import type { ReactNode } from "react";
import { appLoginCardHeaderClassName, appLoginCardHeaderMarkClassName, appLoginCardTitleClassName } from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginCardHeaderProps = {
  title?: string;
  /** Optional mark above the title (e.g. {@link AppLoginBrandMark} `variant="card"`). */
  brandMark?: ReactNode;
  className?: string;
};

export function AppLoginCardHeader({
  title = "Welcome to Visualify",
  brandMark,
  className,
}: AppLoginCardHeaderProps) {
  return (
    <header className={mergeClass(appLoginCardHeaderClassName, className)}>
      {brandMark != null ? <div className={appLoginCardHeaderMarkClassName}>{brandMark}</div> : null}
      <h1 className={appLoginCardTitleClassName}>{title}</h1>
    </header>
  );
}
