"use client";

import { Fragment, useState } from "react";
import type { Risk } from "@/domain/risk/risk.schema";
import type { DecisionMetrics } from "@/domain/decision/decision.types";
import {
  getCurrentRiskRatingLetter,
  getCurrentRiskRatingTitle,
  isRiskStatusDraft,
} from "@/domain/risk/riskFieldSemantics";
import { dlog } from "@/lib/debug";
import { useRiskRegister } from "@/store/risk-register.store";
import { RiskEditCell } from "@/components/risk-register/RiskEditCell";
import { RiskOwnerRowSelect } from "@/components/risk-register/RiskOwnerRowSelect";
import { RiskCategorySelect } from "@/components/risk-register/RiskCategorySelect";
import { RiskStatusSelect } from "@/components/risk-register/RiskStatusSelect";
import { Badge, Callout, Card, TableCell, TableRow } from "@visualify/design-system";

function formatCategoryLabel(category: string | "" | null | undefined): string {
  if (category == null || category === "") return "—";
  return category;
}

type DsBadgeTone = {
  status: "neutral" | "success" | "warning" | "danger" | "info";
  variant: "subtle" | "strong";
};

/** H / M / L (and E) rating letters → DS Badge semantics. */
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

/** Circular DS-aligned rating / movement badge (no custom colours). */
const RATING_BADGE_CIRCLE =
  "!inline-flex !h-7 !w-7 !min-h-[1.75rem] !min-w-[1.75rem] !rounded-full !p-0 items-center justify-center text-[length:var(--ds-text-xs)]";

const DS_NATIVE_SELECT =
  "w-full min-w-0 rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-default)] px-3 py-2 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)]";

/** Category, Owner, Status, Rating — `max-w-0` helps ellipsis; column widths come from table `<colgroup>`. */
const EQUAL_QUARTET_TD = "max-w-0 min-w-0 overflow-hidden align-middle";

/** Match `RISK_ID_COL_PX` in `RiskRegisterTable` so ID header and cells align. */
const RISK_ID_COL_PX = 100;

const DESCRIPTION_TOOLTIP_MAX_LEN = 140;

function truncateDescription(desc: string): string {
  const t = desc.trim();
  if (t.length <= DESCRIPTION_TOOLTIP_MAX_LEN) return t;
  return t.slice(0, DESCRIPTION_TOOLTIP_MAX_LEN).trimEnd() + "…";
}

export function RiskRegisterRow({
  risk,
  rowIndex: _rowIndex,
  decision: _decision,
  scoreDelta: _scoreDelta,
  onRiskClick,
  validationErrors,
}: {
  risk: Risk;
  rowIndex?: number;
  decision?: DecisionMetrics | null;
  scoreDelta?: number;
  /** Row click opens risk details (no separate actions column). */
  onRiskClick?: (risk: Risk) => void;
  /** When present and non-empty, a compact error summary is shown under the row (e.g. from runnable validator). */
  validationErrors?: string[];
}) {
  const { updateRisk } = useRiskRegister();
  const readOnly = Boolean(onRiskClick);
  const [showDescCard, setShowDescCard] = useState(false);
  const hasDescription = Boolean(risk.description?.trim());
  const isDraft = isRiskStatusDraft(risk.status);

  const cellTextClass =
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] truncate min-w-0";

  const riskIdCellTextClass =
    "text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] whitespace-nowrap tabular-nums";

  const handleRowClick = (e: React.MouseEvent) => {
    if (!onRiskClick) return;
    const target = e.target as Node;
    if (
      target instanceof Element &&
      (target.closest("button") ||
        target.closest("select") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("[data-description-card]"))
    )
      return;
    onRiskClick(risk);
  };

  const handleRowFocus = () => {
    if (hasDescription) setShowDescCard(true);
  };
  const handleRowBlur = (e: React.FocusEvent<HTMLTableRowElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowDescCard(false);
  };

  const riskIdDisplay = risk.riskNumber != null ? String(risk.riskNumber).padStart(3, "0") : "—";
  const currentLetter = getCurrentRiskRatingLetter(risk);
  const currentRatingTitle = getCurrentRiskRatingTitle(risk);
  const currentBadge: DsBadgeTone =
    currentLetter === "N/A"
      ? { status: "neutral", variant: "subtle" }
      : ratingLetterToBadgeTone(currentLetter as "L" | "M" | "H" | "E");

  const hasValidationErrors = Boolean(validationErrors?.length);
  const colSpan = 6;

  const rowHoverClass =
    onRiskClick && "cursor-pointer transition-colors hover:bg-[var(--ds-surface-hover)]";

  const draftEdgeClass =
    isDraft &&
    "border-l-2 border-l-[var(--ds-status-warning-border)] bg-[color-mix(in_oklab,var(--ds-status-warning)_8%,var(--ds-surface-default))]";

  return (
    <Fragment>
      <TableRow
        id={`risk-${risk.id}`}
        role={onRiskClick ? "row" : undefined}
        tabIndex={onRiskClick && hasDescription ? 0 : undefined}
        onClick={handleRowClick}
        onFocus={handleRowFocus}
        onBlur={handleRowBlur}
        className={[
          rowHoverClass,
          draftEdgeClass,
          hasValidationErrors ? "border-b-0" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <TableCell
          className="tabular-nums align-middle"
          style={{ width: RISK_ID_COL_PX, minWidth: RISK_ID_COL_PX, maxWidth: RISK_ID_COL_PX }}
        >
          <span className={riskIdCellTextClass} title={risk.id}>
            {riskIdDisplay}
          </span>
        </TableCell>

        {readOnly ? (
          <TableCell className="relative align-middle" style={{ width: "35%", minWidth: 260 }}>
            <div
              className="relative min-w-0 max-w-full"
              onMouseEnter={() => hasDescription && setShowDescCard(true)}
              onMouseLeave={() => setShowDescCard(false)}
            >
              <span className={`${cellTextClass} block`} title={risk.title}>
                {risk.title || "—"}
              </span>
              {hasDescription && showDescCard && (
                <Card
                  data-description-card
                  variant="elevated"
                  role="tooltip"
                  className="absolute left-0 top-full z-10 mt-1 w-max min-w-0 max-w-[320px] p-2.5 shadow-[var(--ds-shadow-md)]"
                >
                  <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-primary)] whitespace-normal">
                    {truncateDescription(risk.description ?? "").split("\n").join(" ")}
                  </p>
                </Card>
              )}
            </div>
          </TableCell>
        ) : (
          <TableCell className="align-middle" style={{ width: "35%", minWidth: 260 }}>
            <div className="min-w-0 max-w-full">
              <RiskEditCell
                value={risk.title}
                placeholder="Risk title"
                onChange={(title) => updateRisk(risk.id, { title })}
              />
            </div>
          </TableCell>
        )}

        {readOnly ? (
          <TableCell className={EQUAL_QUARTET_TD}>
            <span
              className={`${cellTextClass} block w-full`}
              title={risk.category?.trim() ? risk.category : undefined}
            >
              {formatCategoryLabel(risk.category)}
            </span>
          </TableCell>
        ) : (
          <TableCell className={EQUAL_QUARTET_TD}>
            <RiskCategorySelect
              id={`risk-row-category-${risk.id}`}
              value={risk.category ?? ""}
              onChange={(name) => updateRisk(risk.id, { category: name })}
              className={`${DS_NATIVE_SELECT} truncate`}
              allowEmptyPlaceholder={isDraft || !risk.category?.trim()}
            />
          </TableCell>
        )}

        {readOnly ? (
          <TableCell className={EQUAL_QUARTET_TD}>
            <span className={`${cellTextClass} block w-full`} title={risk.owner?.trim() ? risk.owner : undefined}>
              {risk.owner ?? "—"}
            </span>
          </TableCell>
        ) : (
          <TableCell className={EQUAL_QUARTET_TD}>
            <RiskOwnerRowSelect
              riskId={risk.id}
              owner={risk.owner}
              onCommit={(name) => updateRisk(risk.id, { owner: name || undefined })}
              className="truncate"
            />
          </TableCell>
        )}

        <TableCell className={EQUAL_QUARTET_TD}>
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
            {readOnly ? (
              isDraft ? (
                <Badge status="warning" variant="subtle" className="shrink-0">
                  Draft
                </Badge>
              ) : (
                <span className={`${cellTextClass} min-w-0 flex-1 truncate`} title={risk.status}>
                  {risk.status}
                </span>
              )
            ) : (
              <RiskStatusSelect
                id={`risk-row-status-${risk.id}`}
                value={risk.status}
                onChange={(name) => {
                  dlog("[risk register row] status change", name);
                  updateRisk(risk.id, { status: name });
                }}
                className={`${DS_NATIVE_SELECT} truncate`}
              />
            )}
          </div>
        </TableCell>

        <TableCell className={EQUAL_QUARTET_TD}>
          <div className="flex min-w-0 justify-start overflow-hidden">
            <span title={currentRatingTitle}>
              <Badge status={currentBadge.status} variant={currentBadge.variant} className={RATING_BADGE_CIRCLE}>
                {currentLetter}
              </Badge>
            </span>
          </div>
        </TableCell>
      </TableRow>
      {hasValidationErrors && (
        <TableRow>
          <TableCell colSpan={colSpan} className="border-b border-[var(--ds-border-subtle)] p-0">
            <Callout status="warning" role="status" aria-live="polite" className="rounded-none border-x-0 border-t-0">
              {validationErrors!.join(" · ")}
            </Callout>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
