"use client";

import { Fragment, type ReactNode } from "react";
import {
  REPORT_PROJECT_STAGES,
  REPORT_PROJECT_STAGE_DEFAULT,
  getReportProjectStageIndex,
  getReportProjectStageStatus,
  type ReportProjectStage,
  type ReportProjectStageStatus,
} from "@/lib/projects/report-project-stages";

function StageIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const STAGE_ICONS: Record<ReportProjectStage, ReactNode> = {
  "Land Acquisition": (
    <StageIcon>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={11} r={2.25} stroke="currentColor" strokeWidth={1.75} />
    </StageIcon>
  ),
  "Due Diligence": (
    <StageIcon>
      <path
        d="M9 5h-.5A1.5 1.5 0 0 0 7 6.5v13A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 15.5 5H15"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2H9V5z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </StageIcon>
  ),
  Development: (
    <StageIcon>
      <path
        d="M4 21V9l8-4 8 4v12"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path d="M4 21h16M9 21v-5h6v5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      <path d="M12 5v4" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </StageIcon>
  ),
  Delivery: (
    <StageIcon>
      <path
        d="M3 13h11v5H3v-5zm11 0 2.5-4H21v4h-7z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <circle cx={7.5} cy={18.5} r={1.75} stroke="currentColor" strokeWidth={1.75} />
      <circle cx={17.5} cy={18.5} r={1.75} stroke="currentColor" strokeWidth={1.75} />
    </StageIcon>
  ),
  Operations: (
    <StageIcon>
      <circle cx={12} cy={12} r={2.75} stroke="currentColor" strokeWidth={1.75} />
      <path
        d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.55 1.55M16.85 16.85l1.55 1.55M5.6 18.4l1.55-1.55M16.85 7.15l1.55-1.55"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </StageIcon>
  ),
};

function stageIconWellClassName(status: ReportProjectStageStatus): string {
  switch (status) {
    case "current":
      return "border border-[var(--ds-primary)] bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)]";
    case "completed":
      return "border border-[var(--ds-primary)] bg-[var(--ds-primary)] text-[var(--ds-primary-foreground)]";
    case "upcoming":
      return "border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-text-muted)]";
  }
}

function stageLabelClassName(status: ReportProjectStageStatus): string {
  switch (status) {
    case "current":
      return "font-semibold text-[var(--ds-primary)]";
    case "completed":
      return "font-medium text-[var(--ds-primary)]";
    case "upcoming":
      return "font-normal text-[var(--ds-text-muted)]";
  }
}

function StageConnector({
  reached,
  leadsToCurrent,
}: {
  reached: boolean;
  leadsToCurrent: boolean;
}) {
  return (
    <li
      aria-hidden
      className="flex min-w-3 flex-1 items-center px-1 sm:px-1.5"
    >
      <span
        className={[
          "block w-full rounded-full",
          reached
            ? leadsToCurrent
              ? "h-0.5 bg-[var(--ds-primary)]"
              : "h-px bg-[var(--ds-primary)]"
            : "h-px bg-[var(--ds-border-subtle)]",
        ].join(" ")}
      />
    </li>
  );
}

type ReportProjectStageStepperProps = {
  stage: ReportProjectStage | null;
  className?: string;
};

export function ReportProjectStageStepper({
  stage,
  className = "",
}: ReportProjectStageStepperProps) {
  const currentStage = stage ?? REPORT_PROJECT_STAGE_DEFAULT;
  const currentIndex = getReportProjectStageIndex(currentStage);
  const total = REPORT_PROJECT_STAGES.length;

  return (
    <nav
      aria-label="Project stage"
      className={`w-full min-w-0 overflow-x-auto py-0.5 ${className}`.trim()}
    >
      <ol className="m-0 flex min-w-max list-none items-center p-0 sm:min-w-0 sm:w-full">
        {REPORT_PROJECT_STAGES.map((stageLabel, index) => {
          const status = getReportProjectStageStatus(index, currentIndex);
          const isCurrent = status === "current";

          return (
            <Fragment key={stageLabel}>
              {index > 0 ? (
                <StageConnector
                  reached={index <= currentIndex}
                  leadsToCurrent={index === currentIndex}
                />
              ) : null}

              <li
                className="flex shrink-0 items-center gap-1.5 sm:gap-2"
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={[
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                    stageIconWellClassName(status),
                  ].join(" ")}
                >
                  {STAGE_ICONS[stageLabel]}
                </span>
                <span
                  className={[
                    "whitespace-nowrap text-[length:var(--ds-text-xs)] leading-none sm:text-[length:var(--ds-text-sm)]",
                    stageLabelClassName(status),
                  ].join(" ")}
                >
                  {stageLabel}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <p className="sr-only">
        Current project stage: {currentStage}. {currentIndex + 1} of {total} stages.
      </p>
    </nav>
  );
}
