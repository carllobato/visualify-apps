import {
  appLoginFormSkeletonMinHeightClassName,
  appLoginTabsDividerClassName,
  appLoginTabsRowClassName,
  appLoginTabsRowSkeletonClassName,
  appLoginTabsSectionClassName,
} from "./classes";
import { AppLoginCardHeader } from "./AppLoginCardHeader";

/** Placeholder matching login card chrome so the centered block does not shift on hydrate. */
export function AppLoginSuspenseFallback({ label = "Loading sign-in" }: { label?: string }) {
  return (
    <>
      <AppLoginCardHeader />
      <div className={appLoginTabsSectionClassName} aria-hidden>
        <div className={`${appLoginTabsRowClassName} ${appLoginTabsRowSkeletonClassName}`} />
        <div className={appLoginTabsDividerClassName} />
      </div>
      <div
        className={appLoginFormSkeletonMinHeightClassName}
        aria-busy="true"
        aria-live="polite"
        aria-label={label}
      />
    </>
  );
}
