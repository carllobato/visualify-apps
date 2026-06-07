import type { ReactElement } from "react";
import { HQ_ROUTES } from "@/lib/hq-routes";

function IconDashboard() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={3} y={3} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={3} width={8} height={5} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={10} width={8} height={11} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={3} y={13} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function IconWorkspaces() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path stroke="currentColor" strokeWidth={1.5} d="M4 8h6l2 2h8v10H4z" />
    </svg>
  );
}

function IconApps() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={4} y={4} width={6} height={6} rx={1.25} stroke="currentColor" strokeWidth={1.5} />
      <rect x={14} y={4} width={6} height={6} rx={1.25} stroke="currentColor" strokeWidth={1.5} />
      <rect x={4} y={14} width={6} height={6} rx={1.25} stroke="currentColor" strokeWidth={1.5} />
      <rect x={14} y={14} width={6} height={6} rx={1.25} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

const ICON_BY_HREF: Record<string, () => ReactElement> = {
  [HQ_ROUTES.dashboard]: IconDashboard,
  [HQ_ROUTES.workspaceSettings]: IconWorkspaces,
  [HQ_ROUTES.apps]: IconApps,
};

export function HqNavIcon({ href }: { href: string }) {
  const Icon = ICON_BY_HREF[href];
  return Icon ? <Icon /> : <IconDashboard />;
}
