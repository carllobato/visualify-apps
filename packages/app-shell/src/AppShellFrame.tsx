import type { ReactNode } from "react";
import "./app-shell-frame.css";
import {
  appShellFrameGutterClassName,
  appShellFramedSurfaceClassName,
  appShellMainColumnClassName,
  appShellScrollFooterSlotClassName,
  appShellScrollInnerCenteredClassName,
  appShellScrollMainSlotClassName,
  appShellScrollRegionClassName,
} from "./layout-classes";

function mergeClass(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export type { AppShellOuterCanvasProps } from "./AppShellOuterCanvas";
export { AppShellOuterCanvas } from "./AppShellOuterCanvas";

export type AppShellMainColumnProps = {
  children: ReactNode;
  className?: string;
};

/** Flexible main column to the right of a rail (padding + framed surface + scroll). */
export function AppShellMainColumn({ children, className }: AppShellMainColumnProps) {
  return <div className={mergeClass(appShellMainColumnClassName, className)}>{children}</div>;
}

export type AppShellFrameGutterProps = {
  children: ReactNode;
  className?: string;
};

export function AppShellFrameGutter({ children, className }: AppShellFrameGutterProps) {
  return <div className={mergeClass(appShellFrameGutterClassName, className)}>{children}</div>;
}

export type AppShellFramedSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function AppShellFramedSurface({ children, className }: AppShellFramedSurfaceProps) {
  return <div className={mergeClass(appShellFramedSurfaceClassName, className)}>{children}</div>;
}

export type AppShellScrollRegionProps = {
  children: ReactNode;
  /**
   * When set, children render in the main scroll slot and the footer stays at the bottom of this
   * region. Omit for a single scroll child (e.g. centered signed-out body).
   */
  footer?: ReactNode;
  className?: string;
};

/**
 * Scrollable document surface: padding, overflow, and (with `footer`) main + footer column layout.
 * Route `children` should sit in the main slot only — no extra shell wrapper between this node and the page.
 */
export function AppShellScrollRegion({ children, footer, className }: AppShellScrollRegionProps) {
  const rootClass = mergeClass(appShellScrollRegionClassName, className);

  if (footer == null) {
    return <div className={rootClass}>{children}</div>;
  }

  return (
    <div className={rootClass}>
      <div className={appShellScrollMainSlotClassName}>{children}</div>
      <div className={appShellScrollFooterSlotClassName}>{footer}</div>
    </div>
  );
}

export type AppShellScrollBodyCenteredProps = {
  children: ReactNode;
  className?: string;
};

/** Centered content in the scroll region (signed-out / marketing-style shell). */
export function AppShellScrollBodyCentered({ children, className }: AppShellScrollBodyCenteredProps) {
  return <div className={mergeClass(appShellScrollInnerCenteredClassName, className)}>{children}</div>;
}
