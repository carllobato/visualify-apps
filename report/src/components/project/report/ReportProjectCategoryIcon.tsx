import type { ReactNode } from "react";

function CategoryIconSvg({ children }: { children: ReactNode }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
}

const REPORT_PROJECT_CATEGORY_ICONS: Record<string, ReactNode> = {
  Land: (
    <CategoryIconSvg>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={11} r={2.25} stroke="currentColor" strokeWidth={1.75} />
    </CategoryIconSvg>
  ),
  Design: (
    <CategoryIconSvg>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CategoryIconSvg>
  ),
  Authority: (
    <CategoryIconSvg>
      <path
        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x={8}
        y={2}
        width={8}
        height={4}
        rx={1}
        stroke="currentColor"
        strokeWidth={1.75}
      />
      <path
        d="m9 14 2 2 4-4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CategoryIconSvg>
  ),
  "Power & Utilities": (
    <CategoryIconSvg>
      <path
        d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </CategoryIconSvg>
  ),
  Construction: (
    <CategoryIconSvg>
      <path d="M11 21V4.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M11 4.5H21.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M11 4.5H2.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M19 4.5V14.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M17.75 14.5h2.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M5.5 21h11" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path
        d="M8.5 4.5h5v3H8.5V4.5z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </CategoryIconSvg>
  ),
  Customer: (
    <CategoryIconSvg>
      <circle cx={9} cy={8} r={3.25} stroke="currentColor" strokeWidth={1.75} />
      <path
        d="M2.5 20c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M16 8.5a2.75 2.75 0 1 1 0 5.5M19.5 20c0-2.21-1.57-4.05-3.65-4.47"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </CategoryIconSvg>
  ),
};

const DEFAULT_CATEGORY_ICON = (
  <CategoryIconSvg>
    <circle cx={12} cy={12} r={8} stroke="currentColor" strokeWidth={1.75} />
    <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
  </CategoryIconSvg>
);

type ReportProjectCategoryIconProps = {
  category: string;
};

export function ReportProjectCategoryIcon({ category }: ReportProjectCategoryIconProps) {
  return (
    <span className="inline-flex shrink-0 items-center text-[var(--ds-text-secondary)]" aria-hidden>
      {REPORT_PROJECT_CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
    </span>
  );
}
