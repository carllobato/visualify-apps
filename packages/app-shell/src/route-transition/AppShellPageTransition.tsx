"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import "./app-shell-route-transition.css";

export type AppShellPageTransitionProps = {
  children: ReactNode;
  className?: string;
};

/** Wrap route `children` inside {@link AppShellScrollRegion} for in-app route fades. */
export function AppShellPageTransition({ children, className }: AppShellPageTransitionProps) {
  const pathname = usePathname();
  const rootClass = className
    ? `vf-app-shell-page-transition ${className}`
    : "vf-app-shell-page-transition w-full";

  return (
    <div key={pathname} className={rootClass}>
      {children}
    </div>
  );
}
