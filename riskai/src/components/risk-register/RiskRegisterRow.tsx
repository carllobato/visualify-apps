"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Risk } from "@/domain/risk/risk.schema";
import { formatRiskRegisterNumberDisplay } from "@/domain/risk/riskRegisterDisplay";
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

type DescFloatBox = { top: number; left: number; maxHeight?: number };

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
  const [descFloatBox, setDescFloatBox] = useState<DescFloatBox | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const titleAnchorRef = useRef<HTMLDivElement>(null);
  const descFloatRef = useRef<HTMLDivElement>(null);
  const hasDescription = Boolean(risk.description?.trim());
  const isDraft = isRiskStatusDraft(risk.status);

  useEffect(() => setPortalMounted(true), []);

  const positionDescFloat = useCallback(() => {
    const anchor = titleAnchorRef.current;
    const floater = descFloatRef.current;
    if (!anchor || !floater || typeof window === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const pad = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fh = floater.scrollHeight;
    const fw = floater.offsetWidth;

    let top = rect.bottom + gap;
    let maxHeight: number | undefined;

    if (top + fh > vh - pad) {
      const aboveTop = rect.top - gap - fh;
      if (aboveTop >= pad) {
        top = aboveTop;
      } else {
        top = pad;
        maxHeight = vh - 2 * pad;
      }
    }

    if (maxHeight === undefined && top + fh > vh - pad) {
      maxHeight = Math.max(120, vh - pad - top);
    }

    let left = rect.left;
    if (left + fw > vw - pad) {
      left = Math.max(pad, vw - fw - pad);
    }
    if (left < pad) {
      left = pad;
    }

    setDescFloatBox({ top, left, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!showDescCard || !hasDescription) {
      setDescFloatBox(null);
      return;
    }
    positionDescFloat();
    const onMove = () => positionDescFloat();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            positionDescFloat();
          })
        : null;
    if (ro) {
      if (titleAnchorRef.current) ro.observe(titleAnchorRef.current);
      if (descFloatRef.current) ro.observe(descFloatRef.current);
    }
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      ro?.disconnect();
    };
  }, [showDescCard, hasDescription, positionDescFloat, risk.description]);

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
    const next = e.relatedTarget as Node | null;
    if (next && descFloatRef.current?.contains(next)) return;
    if (!e.currentTarget.contains(next)) setShowDescCard(false);
  };

  const riskIdDisplay = formatRiskRegisterNumberDisplay(risk.riskNumber);
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
              ref={titleAnchorRef}
              className="relative min-w-0 max-w-full"
              onMouseEnter={() => hasDescription && setShowDescCard(true)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && descFloatRef.current?.contains(next)) return;
                setShowDescCard(false);
              }}
            >
              <span className={`${cellTextClass} block`} title={risk.title}>
                {risk.title || "—"}
              </span>
              {portalMounted &&
                hasDescription &&
                showDescCard &&
                typeof document !== "undefined" &&
                createPortal(
                  <div
                    ref={descFloatRef}
                    data-description-card
                    className="pointer-events-auto fixed z-[200] w-max min-w-0 max-w-[320px]"
                    style={
                      descFloatBox
                        ? {
                            top: descFloatBox.top,
                            left: descFloatBox.left,
                            visibility: "visible",
                          }
                        : {
                            top: -9999,
                            left: 0,
                            visibility: "hidden",
                          }
                    }
                    onMouseEnter={() => setShowDescCard(true)}
                    onMouseLeave={() => setShowDescCard(false)}
                  >
                    <Card
                      variant="elevated"
                      role="tooltip"
                      className="!overflow-y-auto overflow-x-hidden p-2.5 shadow-[var(--ds-shadow-lg)] ring-1 ring-[color-mix(in_oklab,var(--ds-border)_55%,transparent)]"
                      style={descFloatBox?.maxHeight != null ? { maxHeight: descFloatBox.maxHeight } : undefined}
                    >
                      <p className="m-0 text-[length:var(--ds-text-xs)] leading-snug text-[var(--ds-text-primary)] whitespace-normal">
                        {truncateDescription(risk.description ?? "").split("\n").join(" ")}
                      </p>
                    </Card>
                  </div>,
                  document.body
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
              className="truncate"
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
                className="truncate"
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
