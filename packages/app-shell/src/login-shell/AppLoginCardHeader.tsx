import type { ReactNode } from "react";
import { VisualifyWordmark } from "../VisualifyWordmark";
import {
  appLoginCardHeaderClassName,
  appLoginCardHeaderMarkClassName,
  appLoginCardTitleClassName,
} from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginCardHeaderProps = {
  title?: string;
  /** Optional mark above the title. Defaults to the full Visualify wordmark. Pass `null` to hide. */
  brandMark?: ReactNode | null;
  className?: string;
};

export function AppLoginCardHeader({
  title = "Welcome",
  brandMark,
  className,
}: AppLoginCardHeaderProps) {
  const mark = brandMark === undefined ? <VisualifyWordmark /> : brandMark;

  return (
    <header className={mergeClass(appLoginCardHeaderClassName, className)}>
      {mark != null ? <div className={appLoginCardHeaderMarkClassName}>{mark}</div> : null}
      {title ? <h1 className={appLoginCardTitleClassName}>{title}</h1> : null}
    </header>
  );
}
