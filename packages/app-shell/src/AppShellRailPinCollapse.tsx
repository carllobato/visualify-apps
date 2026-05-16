"use client";

import { railLabelClass } from "./rail-row-classes";
import { appShellRailFooterControlRowClass } from "./rail-footer-row-classes";

function RailPinOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.76Z" />
    </svg>
  );
}

function RailPanelLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

export type AppShellRailPinCollapseProps = {
  pinned: boolean;
  onToggle: () => void;
};

/** Pin-open / collapse control for a collapsible app-shell rail. */
export function AppShellRailPinCollapse({ pinned, onToggle }: AppShellRailPinCollapseProps) {
  return (
    <button
      type="button"
      className={appShellRailFooterControlRowClass(false)}
      aria-pressed={pinned}
      title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
      aria-label={pinned ? "Collapse sidebar" : "Pin sidebar open"}
      onClick={onToggle}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">
        {pinned ? <RailPanelLeftIcon /> : <RailPinOpenIcon />}
      </span>
      <span className={railLabelClass}>{pinned ? "Collapse" : "Pin Open"}</span>
    </button>
  );
}
