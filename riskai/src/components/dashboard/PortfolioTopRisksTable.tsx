"use client";

import { useRouter } from "next/navigation";
import type { PortfolioTopRiskRow } from "@/lib/dashboard/projectTileServerData";
import { riskaiPath } from "@/lib/routes";
import {
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";

const TABLE_CLASS =
  "table-fixed w-full min-w-[28rem] [&_tbody_td]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:normal-case [&_thead_th]:tracking-normal [&_thead_th]:text-[var(--ds-text-muted)]";

/** Project: modest %; Risk: un-sized col takes all remaining space; last two cols fixed narrow width. */
const COLGROUP = (
  <colgroup>
    <col style={{ width: "17%" }} />
    <col />
    <col style={{ width: "5.25rem" }} />
    <col style={{ width: "7rem" }} />
  </colgroup>
);

const TD_PROJECT = "min-w-0 align-middle px-3";
const TD_RISK = "min-w-0 align-middle px-3";
/** Tighter horizontal padding so Rating / Exposure use less width. */
const TD_RATING = "w-[5.25rem] max-w-[5.25rem] min-w-[5.25rem] shrink-0 align-middle px-2";
const TD_EXPOSURE =
  "w-[7rem] max-w-[7rem] min-w-[7rem] shrink-0 align-middle px-2 !text-right tabular-nums font-medium text-[var(--ds-text-primary)] whitespace-nowrap";
const TH_RATING = "w-[5.25rem] max-w-[5.25rem] px-2";
const TH_EXPOSURE = "w-[7rem] max-w-[7rem] px-2 !text-right";

/** Badge cell: clip overflow; column width is fixed via colgroup. */
const RATING_TD = `${TD_RATING} overflow-hidden`;

/** Circular DS rating badge — matches risk register. */
const RATING_BADGE_CIRCLE =
  "!inline-flex !h-7 !w-7 !min-h-[1.75rem] !min-w-[1.75rem] !rounded-full !p-0 items-center justify-center text-[length:var(--ds-text-xs)]";

type DsBadgeTone = {
  status: "neutral" | "success" | "warning" | "danger" | "info";
  variant: "subtle" | "strong";
};

function ratingLetterToBadgeTone(letter: "L" | "M" | "H" | "E"): DsBadgeTone {
  switch (letter) {
    case "L":
      return { status: "success", variant: "subtle" };
    case "M":
      return { status: "warning", variant: "subtle" };
    case "H":
      return { status: "danger", variant: "subtle" };
    case "E":
      return { status: "danger", variant: "strong" };
  }
}

function badgeToneForRatingLetter(letter: string): DsBadgeTone {
  if (letter === "N/A") return { status: "neutral", variant: "subtle" };
  if (letter === "L" || letter === "M" || letter === "H" || letter === "E") {
    return ratingLetterToBadgeTone(letter);
  }
  return { status: "neutral", variant: "subtle" };
}

export type PortfolioTopRisksTableProps = {
  rows: PortfolioTopRiskRow[];
  caption: string;
  emptyMessage: string;
};

export function PortfolioTopRisksTable({ rows, caption, emptyMessage }: PortfolioTopRisksTableProps) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--ds-text-muted)] m-0">{emptyMessage}</p>;
  }

  const singleProjectIdForHeader =
    rows.length > 0 && rows.every((r) => r.projectId === rows[0].projectId) ? rows[0].projectId : null;

  const goToRegister = (projectId: string) => {
    router.push(riskaiPath(`/projects/${projectId}/risks`));
  };

  const goToRiskDetail = (projectId: string, riskId: string) => {
    const q = new URLSearchParams({ openRiskId: riskId });
    router.push(riskaiPath(`/projects/${projectId}/risks?${q.toString()}`));
  };

  return (
    <Card className="overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className={TABLE_CLASS}>
        <caption className="sr-only">{caption}</caption>
        {COLGROUP}
        <TableHead>
          <TableRow
            className={
              singleProjectIdForHeader
                ? "cursor-pointer bg-[var(--ds-surface-muted)] transition-colors hover:bg-[color-mix(in_oklab,var(--ds-surface-muted)_85%,var(--ds-surface-hover))]"
                : undefined
            }
            tabIndex={singleProjectIdForHeader ? 0 : undefined}
            role={singleProjectIdForHeader ? "button" : undefined}
            aria-label={
              singleProjectIdForHeader
                ? "Open risk register for this project"
                : undefined
            }
            onClick={
              singleProjectIdForHeader
                ? (e) => {
                    e.stopPropagation();
                    goToRegister(singleProjectIdForHeader);
                  }
                : undefined
            }
            onKeyDown={
              singleProjectIdForHeader
                ? (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToRegister(singleProjectIdForHeader);
                    }
                  }
                : undefined
            }
          >
            <TableHeaderCell className="align-middle px-3">Project</TableHeaderCell>
            <TableHeaderCell className="align-middle px-3">Risk</TableHeaderCell>
            <TableHeaderCell className={`align-middle ${TH_RATING}`}>Rating</TableHeaderCell>
            <TableHeaderCell className={`align-middle ${TH_EXPOSURE}`}>Exposure</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const ratingTone = badgeToneForRatingLetter(r.rating);
            return (
              <TableRow
                key={r.riskId}
                className="cursor-pointer outline-none transition-colors hover:bg-[var(--ds-surface-hover)] active:bg-[color-mix(in_oklab,var(--ds-surface-muted)_80%,var(--ds-surface-hover))] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ds-primary)]"
                tabIndex={0}
                role="button"
                aria-label={`Open risk details for ${r.riskTitle}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if ((e.target as HTMLElement).closest("[data-portfolio-risk-project-link]")) return;
                  goToRiskDetail(r.projectId, r.riskId);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if ((e.target as HTMLElement).closest("[data-portfolio-risk-project-link]")) return;
                    goToRiskDetail(r.projectId, r.riskId);
                  }
                }}
              >
                <TableCell className={TD_PROJECT}>
                  <button
                    type="button"
                    data-portfolio-risk-project-link
                    className="block min-w-0 max-w-full cursor-pointer truncate bg-transparent p-0 text-left font-medium text-[var(--ds-text-primary)] underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]"
                    title={r.projectName}
                    aria-label={`Open risk register for ${r.projectName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToRegister(r.projectId);
                    }}
                  >
                    {r.projectName}
                  </button>
                </TableCell>
                <TableCell className={TD_RISK}>
                  <span className="block min-w-0 truncate text-[var(--ds-text-secondary)]" title={r.riskTitle}>
                    {r.riskTitle}
                  </span>
                </TableCell>
                <TableCell className={RATING_TD}>
                  <div className="flex min-w-0 justify-start overflow-hidden">
                    <span title={r.rating === "N/A" ? "Rating: N/A" : `Rating: ${r.rating}`}>
                      <Badge status={ratingTone.status} variant={ratingTone.variant} className={RATING_BADGE_CIRCLE}>
                        {r.rating}
                      </Badge>
                    </span>
                  </div>
                </TableCell>
                <TableCell className={TD_EXPOSURE}>{r.exposureDisplay}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
