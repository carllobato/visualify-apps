"use client";

import { useState, useRef, useEffect } from "react";
import type { Risk, RiskLevel } from "@/domain/risk/risk.schema";
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

const LEVEL_LETTER: Record<RiskLevel, string> = { low: "L", medium: "M", high: "H", extreme: "E" };
function levelToLetter(level: RiskLevel): string {
  return LEVEL_LETTER[level] ?? "L";
}
function getMovement(preScore: number, postScore: number): "↑" | "↓" | "→" {
  if (postScore > preScore) return "↑";
  if (postScore < preScore) return "↓";
  return "→";
}
function getPostDisplay(risk: Risk): string {
  return risk.mitigation?.trim() ? levelToLetter(risk.residualRating.level) : "N/A";
}

const SORT_HEADER_BTN =
  "inline-flex min-w-0 max-w-full items-center text-left text-[11px] font-semibold uppercase tracking-[0.06em] " +
  "text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 " +
  "rounded-[calc(var(--ds-radius-md)-2px)] px-1 -mx-1";

export type SortColumn =
  | "riskId"
  | "title"
  | "category"
  | "owner"
  | "preRating"
  | "postRating"
  | "mitigationMovement"
  | "status";

export type SortDirection = "asc" | "desc";

export type TableSortState = { column: SortColumn; direction: SortDirection } | null;

function SortableHeader({
  label,
  column,
  sortState,
  onSort,
  title,
}: {
  label: string;
  column: SortColumn;
  sortState: TableSortState;
  onSort: (column: SortColumn) => void;
  title?: string;
}) {
  const active = sortState?.column === column;
  const dir = active ? sortState.direction : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={SORT_HEADER_BTN}
      title={title ?? `Sort by ${label}`}
    >
      {label}
      {dir === "asc" && (
        <span className="ml-1 text-[var(--ds-text-muted)]" aria-hidden>
          ↑
        </span>
      )}
      {dir === "desc" && (
        <span className="ml-1 text-[var(--ds-text-muted)]" aria-hidden>
          ↓
        </span>
      )}
    </button>
  );
}

/** @deprecated Use SortColumn + TableSortState instead */
export type SortByMitigationMovement = "asc" | "desc" | null;

export type ColumnFilters = Partial<Record<SortColumn, string[]>>;

/** Rating letter order: H, M, L (E first if present). */
const RATING_ORDER = ["E", "H", "M", "L"];
function sortRatingOptions(options: string[]): string[] {
  const order = new Map(RATING_ORDER.map((v, i) => [v, i]));
  return [...options].sort((a, b) => {
    const ia = order.has(a) ? order.get(a)! : 999;
    const ib = order.has(b) ? order.get(b)! : 999;
    return ia - ib;
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
      case "preRating":
        set.add(levelToLetter(r.inherentRating.level));
        break;
      case "postRating":
        set.add(getPostDisplay(r));
        break;
      case "mitigationMovement":
        set.add(getMovement(r.inherentRating.score, r.residualRating.score));
        break;
      case "status":
        set.add(r.status);
        break;
    }
  }
  const arr = Array.from(set);
  if (column === "preRating" || column === "postRating") {
    const ratingLetters = arr.filter((x) => RATING_ORDER.includes(x));
    const other = arr.filter((x) => !RATING_ORDER.includes(x)); // e.g. "N/A" for postRating
    return [...sortRatingOptions(ratingLetters), ...other.sort((a, b) => (a ?? "").localeCompare(b ?? ""))];
  }
  if (column === "mitigationMovement") {
    const movementOrder = ["↑", "→", "↓"]; // up (worsening), same (stable), down (improving)
    const order = new Map(movementOrder.map((v, i) => [v, i]));
    return [...arr].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
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
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={active ? "text-[var(--ds-text-primary)]" : "text-[var(--ds-text-muted)]"}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
}: {
  column: SortColumn;
  options: string[];
  selected: string[];
  onSelect: (values: string[]) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
  const filteredOptions = q ? options.filter((opt) => opt.toLowerCase().includes(q)) : options;

  const toggle = (value: string) => {
    if (selected.includes(value)) onSelect(selected.filter((s) => s !== value));
    else onSelect([...selected, value]);
  };
  const selectAll = () => onSelect([...options]);
  const clearAll = () => onSelect([]);

  return (
    <div
      ref={popoverRef}
      className="ds-floating-panel absolute left-0 top-full z-50 mt-1 min-w-[140px] max-w-[220px] rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-elevated)] py-2 shadow-[var(--ds-shadow-sm)]"
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
      <div className="max-h-48 overflow-y-auto px-2">
        {filteredOptions.length === 0 ? (
          <p className="m-0 py-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">
            {options.length === 0 ? "No options" : "No matches"}
          </p>
        ) : (
          filteredOptions.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-[calc(var(--ds-radius-md)-2px)] px-1 py-1 text-[length:var(--ds-text-sm)] text-[var(--ds-text-primary)] hover:bg-[color-mix(in_oklab,var(--ds-muted)_48%,transparent)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-[var(--ds-border-subtle)]"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))
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
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const optionsSource = risksForFilterOptions ?? risks;
  const options = getDistinctValues(optionsSource, column);
  const selected = columnFilters[column] ?? [];

  return (
    <div className="relative flex min-w-0 items-center gap-1">
      {children}
      {canFilter && onColumnFilterChange && (
        <div className="shrink-0">
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
      {canFilter && onColumnFilterChange && openFilterColumn === column && (
        <FilterPopover
          column={column}
          options={options}
          selected={selected}
          onSelect={(values) => onColumnFilterChange(column, values)}
          onClose={() => setOpenFilterColumn(null)}
          anchorRef={btnRef}
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
  onArchivedRestore,
  onAddNewClick,
  sortState = null,
  onSortByColumn,
  columnFilters = {},
  onColumnFilterChange,
}: {
  risks: Risk[];
  risksForFilterOptions?: Risk[];
  decisionById?: Record<string, DecisionMetrics>;
  scoreDeltaByRiskId?: Record<string, number>;
  onRiskClick?: (risk: Risk) => void;
  /** Archived register: restore to Open from the row. */
  onArchivedRestore?: (risk: Risk) => void;
  onAddNewClick?: () => void;
  sortState?: TableSortState;
  onSortByColumn?: (column: SortColumn) => void;
  columnFilters?: ColumnFilters;
  onColumnFilterChange?: (column: SortColumn, values: string[]) => void;
}) {
  const showActions = Boolean(onRiskClick);
  const canSort = Boolean(onSortByColumn);
  const canFilter = Boolean(onColumnFilterChange);
  const [openFilterColumn, setOpenFilterColumn] = useState<SortColumn | null>(null);
  const filterOptionsRisks = risksForFilterOptions ?? risks;

  const lastColWidth = showActions ? (onArchivedRestore ? 168 : 96) : undefined;

  return (
    <Card className="mt-4 overflow-hidden border-[var(--ds-border-subtle)] p-0">
      <Table className="table-fixed w-full [&_tbody_td]:py-[10px] [&_thead_th]:py-1.5 [&_thead_th]:text-[11px] [&_thead_th]:text-[var(--ds-text-muted)]">
        <colgroup>
          <col style={{ width: 56 }} />
          <col />
          <col />
          <col />
          <col style={{ width: 100 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 100 }} />
          <col />
          {showActions && <col style={{ width: lastColWidth }} />}
        </colgroup>
        <TableHead className="border-b border-[var(--ds-border-subtle)]">
          <TableRow>
            <TableHeaderCell className="align-middle">
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
                  <SortableHeader label="Risk ID" column="riskId" sortState={sortState} onSort={onSortByColumn!} />
                ) : (
                  <span>Risk ID</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
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
            <TableHeaderCell className="align-middle">
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
                  <span>Category</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
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
                  <span>Owner</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
              <HeaderCell
                canFilter={canFilter}
                column="preRating"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader
                    label="Pre Rating"
                    column="preRating"
                    sortState={sortState}
                    onSort={onSortByColumn!}
                  />
                ) : (
                  <span>Pre Rating</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
              <HeaderCell
                canFilter={canFilter}
                column="postRating"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader
                    label="Post Rating"
                    column="postRating"
                    sortState={sortState}
                    onSort={onSortByColumn!}
                  />
                ) : (
                  <span>Post Rating</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
              <HeaderCell
                canFilter={canFilter}
                column="mitigationMovement"
                risks={risks}
                risksForFilterOptions={filterOptionsRisks}
                columnFilters={columnFilters}
                onColumnFilterChange={onColumnFilterChange}
                openFilterColumn={openFilterColumn}
                setOpenFilterColumn={setOpenFilterColumn}
              >
                {canSort ? (
                  <SortableHeader
                    label="Mitigation Movement"
                    column="mitigationMovement"
                    sortState={sortState}
                    onSort={onSortByColumn!}
                    title="Improving ↓, worsening ↑, stable →"
                  />
                ) : (
                  <span title="Improving ↓, worsening ↑, stable →">Mitigation Movement</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            <TableHeaderCell className="align-middle">
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
                  <span>Status</span>
                )}
              </HeaderCell>
            </TableHeaderCell>
            {showActions && <TableHeaderCell className="align-middle" />}
          </TableRow>
        </TableHead>
        <TableBody className="[&>tr]:border-[var(--ds-border-subtle)]">
          {risks.length === 0 && !onAddNewClick ? (
            <TableRow>
              <TableCell colSpan={showActions ? 9 : 8}>
                <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]">No risks yet.</p>
              </TableCell>
            </TableRow>
          ) : (
            <>
              {risks.map((risk, index) => (
                <RiskRegisterRow
                  key={risk.id ?? (risk as { tempId?: string }).tempId ?? index}
                  risk={risk}
                  rowIndex={index}
                  decision={decisionById[risk.id]}
                  scoreDelta={scoreDeltaByRiskId[risk.id]}
                  onRiskClick={onRiskClick}
                  onRestoreArchived={onArchivedRestore}
                  validationErrors={getRiskValidationErrors(risk)}
                />
              ))}
              {onAddNewClick && showActions && (
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
