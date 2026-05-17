import {
  appLoginFormSkeletonMinHeightClassName,
  appLoginTabsDividerClassName,
  appLoginTabsRowClassName,
} from "./classes";
import { AppLoginCardHeader } from "./AppLoginCardHeader";

/** Placeholder matching login card chrome so the centered block does not shift on hydrate. */
export function AppLoginSuspenseFallback({ label = "Loading sign-in" }: { label?: string }) {
  return (
    <>
      <AppLoginCardHeader />
      <div className="mb-4 w-full" aria-hidden>
        <div className={`${appLoginTabsRowClassName} min-h-[2.5rem]`} />
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
