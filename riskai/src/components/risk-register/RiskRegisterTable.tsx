"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { Risk } from "@/domain/risk/risk.schema";
import { getCurrentRiskRatingLetter, normalizeRiskStatusKey } from "@/domain/risk/riskFieldSemantics";
import type { DecisionMetrics } from "@/domain/decision/decision.types";
import { getRiskValidationErrors } from "@/domain/risk/runnable-risk.validator";
import { RiskRegisterRow } from "@/components/risk-register/RiskRegisterRow";
import {
  Button,
  Card,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@visualify/design-system";

const SORT_HEADER_BTN_BASE =
  "inline-flex w-full min-w-0 max-w-full items-center gap-0.5 overflow-hidden text-[11px] font-semibold uppercase tracking-[0.06em] " +
  "text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 " +
  "rounded-[calc(var(--ds-radius-md)-2px)] px-1 -mx-1";

const SORT_HEADER_ALIGN = {
  left: "justify-start text-left",
  center: "justify-center text-center",
} as const;

const HEADER_STATIC_TRUNCATE = "block min-w-0 truncate";

/** Category, Owner, Status — shared width; Rating is narrower (badge-only). */
const REGISTER_TRIO_COL = "15%";
const REGISTER_RATING_COL = "10%";
/** Title absorbs remainder vs fixed ID + trio + rating. */
const REGISTER_TITLE_COL_PCT = "35%";

/** Wide enough for “RISK ID” + sort arrow without truncating the header. */
const RISK_ID_COL_PX = 100;

export type SortColumn =
  | "riskId"
  | "title"
  | "category"
  | "owner"
  | "currentRating"
  | "status";

export type SortDirection = "asc" | "desc";

export type TableSortState = { column: SortColumn; direction: SortDirection } | null;

function SortableHeader({
  label,
  column,
  sortState,
  onSort,
  title,
  textAlign = "left",
}: {
  label: string;
  column: SortColumn;
  sortState: TableSortState;
  onSort: (column: SortColumn) => void;
  title?: string;
  textAlign?: "left" | "center";
}) {
  const active = sortState?.column === column;
  const dir = active ? sortState.direction : null;
  const align = SORT_HEADER_ALIGN[textAlign];
  const labelAlign = textAlign === "center" ? "text-center" : "text-left";
  const labelSpanClass =
    column === "riskId"
      ? `shrink-0 whitespace-nowrap ${labelAlign}`
      : `min-w-0 flex-1 truncate ${labelAlign}`;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`${SORT_HEADER_BTN_BASE} ${align}`}
      title={title ?? `Sort by ${label}`}
    >
      <span className={labelSpanClass}>{label}</span>
      {dir === "asc" && (
        <span className="shrink-0 text-[var(--ds-text-muted)]" aria-hidden>
          ↑
        </span>
      )}
      {dir === "desc" && (
        <span className="shrink-0 text-[var(--ds-text-muted)]" aria-hidden>
          ↓
        </span>
      )}
    </button>
  );
}

/** @deprecated Use SortColumn + TableSortState instead */
export type SortByMitigationMovement = "asc" | "desc" | null;

export type ColumnFilters = Partial<Record<SortColumn, string[]>>;

/** Rating filter / distinct-value order (letters; table cells unchanged). */
const RATING_LETTER_ORDER = ["L", "M", "H", "E", "N/A"];

/** Filter popover labels for Rating; table cells still use H / M / L / E / N/A letters. */
const RATING_LETTER_TO_FILTER_LABEL: Record<string, string> = {
  E: "Extreme",
  H: "High",
  M: "Medium",
  L: "Low",
  "N/A": "N/A",
};

function ratingFilterOptionLabel(letter: string): string {
  return RATING_LETTER_TO_FILTER_LABEL[letter] ?? letter;
}
function sortRatingOptions(options: string[]): string[] {
  const order = new Map(RATING_LETTER_ORDER.map((v, i) => [v, i]));
  return [...options].sort((a, b) => {
    const ia = order.has(a) ? order.get(a)! : 999;
    const ib = order.has(b) ? order.get(b)! : 999;
    return ia - ib;
  });
}

/**
 * Filter list order for status (by normalised key; display strings stay as stored on risks / lookup).
 * Draft → Open → Monitoring → Mitigating → Mitigated → Closed → Archived.
 */
const STATUS_FILTER_ORDER_KEYS = [
  "draft",
  "open",
  "monitoring",
  "mitigating",
  "mitigated",
  "closed",
  "archived",
] as const;

function sortStatusFilterOptions(options: string[]): string[] {
  const order = new Map<string, number>(STATUS_FILTER_ORDER_KEYS.map((k, i) => [k, i]));
  return [...options].sort((a, b) => {
    const ka = normalizeRiskStatusKey(a);
    const kb = normalizeRiskStatusKey(b);
    const ia = order.has(ka) ? order.get(ka)! : 1000;
    const ib = order.has(kb) ? order.get(kb)! : 1000;
    if (ia !== ib) return ia - ib;
    return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
  });
}

function getDistinctValues(risks: Risk[], column: SortColumn): string[] {
  const set = new Set<string>();
  for (const r of risks) {
    switch (column) {
      case "riskId":
        if (r.riskNumber != null) set.add(String(r.riskNumber).padStart(3, "0"));
        break;
      case "title":
        if (r.title?.trim()) set.add(r.title.trim());
        break;
      case "category":
        set.add(r.category);
        break;
      case "owner":
        set.add(r.owner ?? "—");
        break;
      case "currentRating":
        set.add(getCurrentRiskRatingLetter(r));
        break;
      case "status":
        set.add(r.status);
        break;
    }
  }
  const arr = Array.from(set);
  if (column === "currentRating") {
    const ratingLetters = arr.filter((x) => RATING_LETTER_ORDER.includes(x));
    const other = arr.filter((x) => !RATING_LETTER_ORDER.includes(x));
    return [...sortRatingOptions(ratingLetters), ...other.sort((a, b) => (a ?? "").localeCompare(b ?? ""))];
  }
  if (column === "status") {
    return sortStatusFilterOptions(arr);
  }
  return arr.sort((a, b) => (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" }));
}

function FilterIcon({ active }: { active?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
      className={active ? "text-[var(--ds-primary)]" : "text-[var(--ds-text-muted)]"}
    >
      <polygon
        points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
        fill={active ? "currentColor" : "none"}
        stroke={active ? "none" : "currentColor"}
        strokeWidth={active ? undefined : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FilterPopover({
  column,
  options,
  selected,
  onSelect,
  onClose,
  anchorRef,
  getOptionLabel,
}: {
  column: SortColumn;
  options: string[];
  selected: string[];
  onSelect: (values: string[]) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  /** When set, list shows these labels but `selected` / `onSelect` still use raw option values (e.g. rating letters). */
  getOptionLabel?: (value: string) => string;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fixedPos, setFixedPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useLayoutEffect(() => {
    function syncPosition() {
      const btn = anchorRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setFixedPos({
        top: rect.bottom + 4,
        right: Math.max(0, window.innerWidth - rect.right),
      });
    }
    syncPosition();
    window.addEventListener("resize", syncPosition);
    document.addEventListener("scroll", syncPosition, true);
    return () => {
      window.removeEventListener("resize", syncPosition);
      document.removeEventListener("scroll", syncPosition, true);
    };
  }, [anchorRef, column]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        anchorRef.current?.contains(e.target as Node) ||
        popoverRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  useEffect(() => {
    setSearchQuery("");
    const id = `risk-filter-search-${column}`;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  }, [column]);

  const q = searchQuery.trim().toLowerCase();
  const filteredOptions = q
    ? options.filter((opt) => {
        const label = getOptionLabel?.(opt) ?? opt;
        return opt.toLowerCase().includes(q) || label.toLowerCase().includes(q);
      })
    : options;

  const toggle = (value: string) => {
    if (selected.includes(value)) onSelect(selected.filter((s) => s !== value));
    else onSelect([...selected, value]);
  };
  const selectAll = () => onSelect([...options]);
  const clearAll = () => onSelect([]);

  /** Reserve ~search + footer chrome; cap so the panel stays usable on short viewports. */
  const listMaxHeight =
    typeof window !== "undefined"
      ? Math.min(
          384,
          Math.max(120, window.innerHeight - fixedPos.top - 8 - 96)
        )
      : 192;

  const panel = (
    <div
      ref={popoverRef}
      className="ds-floating-panel fixed z-[200] min-w-[140px] max-w-[220px] rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-elevated)] py-2 shadow-[var(--ds-shadow-sm)]"
      style={{ top: fixedPos.top, right: fixedPos.right, left: "auto" }}
      role="dialog"
      aria-label={`Filter by ${column}`}
    >
      <div className="mb-2 border-b border-[var(--ds-border-subtle)] px-2 pb-2">
        <Input
          id={`risk-filter-search-${column}`}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="h-8"
          aria-label="Search options"
        />
      </div>
      <div className="overflow-y-auto px-2" style={{ maxHeight: listMaxHeight }}>
        {filteredOptions.length === 0 ? (
          <p className="m-0 py-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {options.length === 0 ? "No options" : "No matches"}
          </p>
        ) : (
          filteredOptions.map((opt) => {
            const displayLabel = getOptionLabel?.(opt) ?? opt;
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--ds-radius-md)-2px)] px-1 py-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] hover:bg-[color-mix(in_oklab,var(--ds-muted)_48%,transparent)]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-[var(--ds-border-subtle)]"
                  aria-label={displayLabel}
                />
                <span className="truncate">{displayLabel}</span>
              </label>
            );
          })
        )}
      </div>
      <div className="mt-1 flex gap-1 border-t border-[var(--ds-border-subtle)] px-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
          All
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(panel, document.body) : null;
}

function HeaderCell({
  children,
  canFilter,
  column,
  risks,
  risksForFilterOptions,
  columnFilters,
  onColumnFilterChange,
  openFilterColumn,
  setOpenFilterColumn,
  contentAlign = "left",
}: {
  children: React.ReactNode;
  canFilter: boolean;
  column: SortColumn;
  risks: Risk[];
  risksForFilterOptions?: Risk[];
  columnFilters: ColumnFilters;
  onColumnFilterChange?: (column: SortColumn, values: string[]) => void;
  openFilterColumn: SortColumn | null;
  setOpenFilterColumn: (col: SortColumn | null) => void;
  /** Center label + sort control (filter stays pinned right). */
  contentAlign?: "left" | "center";
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const optionsSource = risksForFilterOptions ?? risks;
  const options = getDistinctValues(optionsSource, column);
  const selected = columnFilters[column] ?? [];
  const centered = contentAlign === "center";
  const showFilter = canFilter && onColumnFilterChange && column !== "riskId";
  const centeredContentClass = centered
    ? showFilter
      ? "min-w-0 max-w-[calc(100%-1.75rem)] overflow-hidden text-center"
      : "min-w-0 w-full overflow-hidden text-center"
    : "min-w-0 flex-1 overflow-hidden";

  return (
    <div
      className={`relative flex min-w-0 w-full items-center ${centered ? "justify-center" : "gap-1"}`}
    >
      <div className={centeredContentClass}>{children}</div>
      {showFilter && (
        <div className={`shrink-0 ${centered ? "absolute right-0 top-1/2 -translate-y-1/2" : ""}`}>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOpenFilterColumn(openFilterColumn === column ? null : column)}
            className="rounded-[calc(var(--ds-radius-md)-2px)] p-0.5 text-[var(--ds-text-muted)] hover:bg-[color-mix(in_oklab,var(--ds-muted)_48%,transparent)] hover:text-[var(--ds-text-primary)]"
            title={`Filter ${column}`}
            aria-label={`Filter by ${column}`}
            aria-expanded={openFilterColumn === column}
          >
            <FilterIcon active={selected.length > 0} />
          </button>
        </div>
      )}
      {showFilter && openFilterColumn === column && (
        <FilterPopover
          column={column}
          options={options}
          selected={selected}
          onSelect={(values) => onColumnFilterChange(column, values)}
          onClose={() => setOpenFilterColumn(null)}
          anchorRef={btnRef}
          getOptionLabel={column === "currentRating" ? ratingFilterOptionLabel : undefined}
        />
      )}
    </div>
  );
}

export function RiskRegisterTable({
  risks,
  risksForFilterOptions,
  decisionById = {},
  scoreDeltaByRiskId = {},
  onRiskClick,
  onAddNewClick,
  sortState = null,
  onSortByColumn,
  columnFilters = {},
  onColumnFilterChange,
  emptyListMessage,
}: {
  risks: Risk[];
  risksForFilterOptions?: Risk[];
  decisionById?: Record<string, DecisionMetrics>;
  scoreDeltaByRiskId?: Record<string, number>;
  /** Row click opens risk details (read-only register); no separate actions column. */
  onRiskClick?: (risk: Risk) => void;
  onAddNewClick?: () => void;
  sortState?: TableSortState;
  onSortByColumn?: (column: SortColumn) => void;
  columnFilters?: ColumnFilters;
  onColumnFilterChange?: (column: SortColumn, values: string[]) => void;
  /** When `risks` is empty but the project has risks (search/filters), show this instead of implying an empty register. */
  emptyListMessage?: string;
}) {
  const canSort = Boolean(onSortByColumn);
  const canFilter = Boolean(onColumnFilterChange);
  const [openFilterColumn, setOpenFilterColumn] = useState<SortColumn | null>(null);
  const filterOptionsRisks = risksForFilterOptions ?? risks;

  return (
    <Card className="mt-4 overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className="table-fixed w-full [&_tbody_td]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:text-[var(--ds-text-muted)]">
        <colgroup>
          <col style={{ width: RISK_ID_COL_PX }} />
          {/* Title: primary column; plain % on <col> for reliable sizing (match row title cells). */}
          <col style={{ width: REGISTER_TITLE_COL_PCT }} />
          <col style={{ width: REGISTER_TRIO_COL }} />
          <col style={{ width: REGISTER_TRIO_COL }} />
          <col style={{ width: REGISTER_TRIO_COL }} />
          <col style={{ width: REGISTER_RATING_COL }} />
        </colgroup>
        <TableHead className="border-b border-[var(--ds-border-subtle)]">
          <TableRow>
            <TableHeaderCell className="align-middle" style={{ width: RISK_ID_COL_PX, minWidth: RISK_ID_COL_PX }}>
              <HeaderCell
                canFilter={canFilter}
                column="riskId"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader label="ID" column="riskId" sortState={sortState} onSort={onSortByColumn!} />
                ) : (
                  <span className="whitespace-nowrap">ID</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell
              className="align-middle"
              style={{ width: REGISTER_TITLE_COL_PCT, minWidth: 260 }}
            >
              <HeaderCell
                canFilter={canFilter}
                column="title"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader label="Title" column="title" sortState={sortState} onSort={onSortByColumn!} />
                ) : (
                  <span>Title</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell
              className="min-w-0 align-middle overflow-visible"
              style={{ width: REGISTER_TRIO_COL }}
            >
              <HeaderCell
                canFilter={canFilter}
                column="category"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader
                    label="Category"
                    column="category"
                    sortState={sortState}
                    onSort={onSortByColumn!}
                  />
                ) : (
                  <span className={HEADER_STATIC_TRUNCATE}>Category</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell
              className="min-w-0 align-middle overflow-visible"
              style={{ width: REGISTER_TRIO_COL }}
            >
              <HeaderCell
                canFilter={canFilter}
                column="owner"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader label="Owner" column="owner" sortState={sortState} onSort={onSortByColumn!} />
                ) : (
                  <span className={HEADER_STATIC_TRUNCATE}>Owner</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell
              className="min-w-0 align-middle overflow-visible"
              style={{ width: REGISTER_TRIO_COL }}
            >
              <HeaderCell
                canFilter={canFilter}
                column="status"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader label="Status" column="status" sortState={sortState} onSort={onSortByColumn!} />
                ) : (
                  <span className={HEADER_STATIC_TRUNCATE}>Status</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell
              className="min-w-0 align-middle overflow-visible"
              style={{ width: REGISTER_RATING_COL }}
            >
              <HeaderCell
                canFilter={canFilter}
                column="currentRating"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader
                    label="Rating"
                    column="currentRating"
                    sortState={sortState}
                    onSort={onSortByColumn!}
                    title="Pre-mitigation for Open/Monitoring; post-mitigation for Mitigating; N/A for Draft/Closed"
                  />
                ) : (
                  <span
                    className={HEADER_STATIC_TRUNCATE}
                    title="Pre-mitigation for Open/Monitoring; post-mitigation for Mitigating; N/A for Draft/Closed"
                  >
                    Rating
                  </span>
                )}
              </HeaderCell>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody className="[&>tr]:border-[var(--ds-border-subtle)]">
          {risks.length === 0 && !onAddNewClick ? (
            <TableRow>
              <TableCell colSpan={6}>
                <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
                  {emptyListMessage ?? "No risks yet."}
                </p>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {risks.length === 0 && emptyListMessage ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">{emptyListMessage}</p>
                  </TableCell>
                </TableRow>
              ) : null}
              {risks.map((risk, index) => (
                <RiskRegisterRow
                  key={risk.id ?? (risk as { tempId?: string }).tempId ?? index}
                  risk={risk}
                  rowIndex={index}
                  decision={decisionById[risk.id]}
                  scoreDelta={scoreDeltaByRiskId[risk.id]}
                  onRiskClick={onRiskClick}
                  validationErrors={getRiskValidationErrors(risk)}
                />
              ))}
              {onAddNewClick && (
                <TableRow
                  role="row"
                  className="cursor-pointer border-t border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-hover)]"
                  onClick={onAddNewClick}
                >
                  <TableCell className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]" aria-hidden>
                    {"\u00A0"}
                  </TableCell>
                  <TableCell className="text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-secondary)]">
                    Add new risk
                  </TableCell>
                  <TableCell aria-hidden className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    {"\u00A0"}
                  </TableCell>
                  <TableCell aria-hidden className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    {"\u00A0"}
                  </TableCell>
                  <TableCell aria-hidden className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    {"\u00A0"}
                  </TableCell>
                  <TableCell aria-hidden className="text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                    {"\u00A0"}
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
