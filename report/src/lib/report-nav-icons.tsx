import type { ReactElement } from "react";
import { REPORT_ROUTES } from "@/lib/report-routes";

function IconProjects() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path stroke="currentColor" strokeWidth={1.5} d="M4 8h6l2 2h8v10H4z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v4a2 2 0 0 0 2 2h4M8 18v-2M12 18v-4M16 18v-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICON_BY_HREF: Record<string, () => ReactElement> = {
  [REPORT_ROUTES.projects]: IconProjects,
};

export function ReportNavIcon({ href, label }: { href: string; label: string }) {
  if (label === "Reports") {
    return <IconReport />;
  }
  const Icon = ICON_BY_HREF[href];
  return Icon ? <Icon /> : <IconProjects />;
}
