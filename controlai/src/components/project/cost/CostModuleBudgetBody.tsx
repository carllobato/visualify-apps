"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from "@visualify/design-system";
import {
  buildBudgetDisplayRows,
  filterVisibleBudgetDisplayRows,
  buildParentWbsIdMap,
  displayRowHasVisibleDescendants,
  formatBudgetAmountDisplay,
  formatBudgetAmountEdit,
  formatBudgetAmountRow,
  formatWbsCodeDisplay,
  parseBudgetAmountInput,
  sumDirectBudgetAmounts,
} from "@/lib/cost/cost-budget-display";
import type {
  CostBudgetDisplayRow,
  CostBudgetTableRow,
  CostBudgetWbsOption,
  CostModuleBudgetData,
} from "@/lib/cost/cost-budget-types";

type BudgetRow = CostBudgetTableRow;

const DESCRIPTION_INDENT_REM = 0.625;
const BUDGET_TABLE_CELL_CLASS = "!py-0 !px-1.5 align-middle";
const BUDGET_TABLE_HEADER_CELL_CLASS = "!py-0.5 !px-1.5 align-middle";
const BUDGET_TABLE_ROW_CLASS = "group h-8 cursor-pointer [&>td]:!py-0";
const BUDGET_CODE_CELL_CLASS = `${BUDGET_TABLE_CELL_CLASS} w-[120px] max-w-[120px] whitespace-nowrap`;
const BUDGET_DESCRIPTION_CELL_CLASS = `${BUDGET_TABLE_CELL_CLASS} min-w-0`;
const BUDGET_AMOUNT_CELL_CLASS = `${BUDGET_TABLE_CELL_CLASS} w-[180px] max-w-[180px] overflow-hidden text-right`;
const BUDGET_AMOUNT_HEADER_CLASS = `${BUDGET_TABLE_HEADER_CELL_CLASS} w-[180px] max-w-[180px] text-right`;
const BUDGET_NOTES_CELL_CLASS = `${BUDGET_TABLE_CELL_CLASS} min-w-0 overflow-hidden`;
const BUDGET_ACTIONS_CELL_CLASS = `${BUDGET_TABLE_CELL_CLASS} w-[140px] max-w-[140px] overflow-hidden whitespace-nowrap text-right`;
const BUDGET_ACTIONS_HEADER_CLASS = `${BUDGET_TABLE_HEADER_CELL_CLASS} w-[140px] max-w-[140px] text-right`;
/** Overrides DS document-tile field chrome for compact in-table editors. */
const BUDGET_CELL_INPUT_BASE_CLASS =
  "!h-6 !min-h-6 !max-h-6 !py-0 !px-1 !text-[length:var(--ds-text-xs)] !leading-snug " +
  "!rounded-[4px] !border !border-[var(--ds-border-subtle)] !bg-[var(--ds-surface)] !shadow-none " +
  "enabled:hover:!bg-[var(--ds-surface)] enabled:hover:!shadow-none " +
  "focus-visible:!outline focus-visible:!outline-1 focus-visible:!outline-offset-0 focus-visible:!outline-[var(--ds-primary)] " +
  "ring-0 disabled:!shadow-none";
const BUDGET_AMOUNT_INPUT_CLASS = `${BUDGET_CELL_INPUT_BASE_CLASS} !w-full !max-w-full !min-w-0 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
const BUDGET_NOTES_INPUT_CLASS = `${BUDGET_CELL_INPUT_BASE_CLASS} !w-full !max-w-full !min-w-0 text-left`;
const BUDGET_STATIC_VALUE_CLASS =
  "flex h-8 max-h-8 min-h-8 items-center text-[length:var(--ds-text-xs)] leading-snug";
const BUDGET_TABLE_EDIT_BUTTON_CLASS =
  "!h-6 !min-h-6 !max-h-6 !rounded-[4px] !px-1.5 !py-0 !text-[length:var(--ds-text-xs)] !font-medium";
const BUDGET_EDIT_SAVE_BUTTON_CLASS =
  `${BUDGET_TABLE_EDIT_BUTTON_CLASS} !shadow-none hover:!shadow-none active:!brightness-[0.97]`;
const BUDGET_EDIT_CANCEL_BUTTON_CLASS = `${BUDGET_TABLE_EDIT_BUTTON_CLASS} !font-normal`;
const BUDGET_CHEVRON_BUTTON_CLASS =
  "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[var(--ds-radius-sm)] text-[var(--ds-text-secondary)] hover:bg-[color-mix(in_oklab,var(--ds-surface-hover)_70%,var(--ds-border-subtle))] hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]";
const BUDGET_PROJECT_TOTAL_ROW_CLASS = `${BUDGET_TABLE_ROW_CLASS} h-9 cursor-default border-t-2 border-[var(--ds-border)] [&>td]:!bg-[var(--ds-surface-muted)] [&>td]:!py-1`;

const BUDGET_ROW_SELECTED_CLASS =
  "!bg-[color-mix(in_oklab,var(--ds-surface-hover)_42%,var(--ds-border))] transition-colors";
const BUDGET_ROW_DEPTH_0_BASE_CLASS =
  "bg-[color-mix(in_oklab,var(--ds-surface-muted)_75%,transparent)] transition-colors group-hover:!bg-[color-mix(in_oklab,color-mix(in_oklab,var(--ds-surface-muted)_75%,transparent)_50%,color-mix(in_oklab,var(--ds-surface-hover)_42%,var(--ds-border))_50%)]";
const BUDGET_ROW_DEPTH_1_BASE_CLASS =
  "bg-[color-mix(in_oklab,var(--ds-surface-muted)_35%,transparent)] transition-colors group-hover:!bg-[color-mix(in_oklab,color-mix(in_oklab,var(--ds-surface-muted)_35%,transparent)_50%,color-mix(in_oklab,var(--ds-surface-hover)_42%,var(--ds-border))_50%)]";
const BUDGET_ROW_LEAF_CLASS =
  "transition-colors group-hover:!bg-[color-mix(in_oklab,transparent_50%,color-mix(in_oklab,var(--ds-surface-hover)_42%,var(--ds-border))_50%)]";

function budgetRowCellBackgroundClass(depth: number, isActive: boolean): string {
  if (isActive) return BUDGET_ROW_SELECTED_CLASS;
  if (depth === 0) return BUDGET_ROW_DEPTH_0_BASE_CLASS;
  if (depth === 1) return BUDGET_ROW_DEPTH_1_BASE_CLASS;
  return BUDGET_ROW_LEAF_CLASS;
}

function budgetRowUsesBoldText(depth: number): boolean {
  return depth === 0;
}

function IconChevronDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseWbsCodeSegment(segment: string): number | null {
  if (!/^\d+$/.test(segment)) return null;
  return Number(segment);
}

/** Hierarchical numeric order for dotted WBS codes (e.g. 09 < 09.01 < 10). */
function compareWbsCodesByNumber(a: string, b: string): number {
  const partsA = a.split(".");
  const partsB = b.split(".");
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i += 1) {
    const partA = partsA[i];
    const partB = partsB[i];

    if (partA === undefined) return -1;
    if (partB === undefined) return 1;

    const numA = parseWbsCodeSegment(partA);
    const numB = parseWbsCodeSegment(partB);

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
      continue;
    }

    const cmp = partA.localeCompare(partB, undefined, { numeric: true });
    if (cmp !== 0) return cmp;
  }

  return 0;
}

function compareWbsOptions(a: CostBudgetWbsOption, b: CostBudgetWbsOption): number {
  const byCode = compareWbsCodesByNumber(a.code, b.code);
  if (byCode !== 0) return byCode;
  return a.description.localeCompare(b.description, undefined, { sensitivity: "base" });
}

function filterWbsOptions(options: CostBudgetWbsOption[], query: string): CostBudgetWbsOption[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = !trimmed
    ? options
    : options.filter(
        (option) =>
          option.code.toLowerCase().includes(trimmed) ||
          formatWbsCodeDisplay(option.code).toLowerCase().includes(trimmed) ||
          option.description.toLowerCase().includes(trimmed),
      );
  return [...filtered].sort(compareWbsOptions);
}

function isValidBudgetAmount(value: string) {
  const canonical = parseBudgetAmountInput(value);
  if (!canonical) return false;
  const parsed = Number(canonical);
  return Number.isFinite(parsed);
}

function isDirectRowDirty(row: BudgetRow, serverRow: BudgetRow | undefined) {
  if (!serverRow) return false;
  return row.budgetAmount !== serverRow.budgetAmount || row.notes !== serverRow.notes;
}

function wbsCodeIndent(depth: number): string {
  return `${depth * DESCRIPTION_INDENT_REM}rem`;
}

type BudgetTableDisplayRowProps = {
  row: CostBudgetDisplayRow;
  hasDescendants: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  isSelected: boolean;
  onSelectRow: (rowKey: string) => void;
  onToggleCollapse: (wbsId: string) => void;
  onStartEdit: (budgetId: string) => void;
  onCancelEdit: (budgetId: string) => void;
  editedValues: { budgetAmount: string; notes: string };
  displayValues: { budgetAmount: string; notes: string };
  serverRowById: Map<string, BudgetRow>;
  rowErrors: Record<string, string>;
  saving: boolean;
  savingRowId: string | null;
  onUpdateRow: (id: string, patch: Partial<Pick<BudgetRow, "budgetAmount" | "notes">>) => void;
  onSaveRow: (row: BudgetRow) => void;
  onClearRowError: (budgetId: string) => void;
};

function BudgetTableDisplayRow({
  row,
  hasDescendants,
  isExpanded,
  isEditing,
  isSelected,
  onSelectRow,
  onToggleCollapse,
  onStartEdit,
  onCancelEdit,
  editedValues,
  displayValues,
  serverRowById,
  rowErrors,
  saving,
  savingRowId,
  onUpdateRow,
  onSaveRow,
  onClearRowError,
}: BudgetTableDisplayRowProps) {
  const isRollup = row.kind === "rollup";
  const useBoldText = budgetRowUsesBoldText(row.depth);
  const budgetId = row.budgetId;
  const serverRow = budgetId ? serverRowById.get(budgetId) : undefined;
  const directRowForSave: BudgetRow | undefined =
    !isRollup && budgetId
      ? {
          id: budgetId,
          wbsId: row.wbsId,
          wbsCode: row.wbsCode,
          wbsDescription: row.wbsDescription,
          budgetAmount: editedValues.budgetAmount,
          notes: editedValues.notes,
        }
      : undefined;
  const dirty =
    directRowForSave && serverRow ? isDirectRowDirty(directRowForSave, serverRow) : false;
  const rowError = budgetId ? rowErrors[budgetId] : undefined;
  const rowSaving = budgetId !== undefined && savingRowId === budgetId;
  const codeLabelClass = useBoldText
    ? "font-semibold text-[var(--ds-text-primary)]"
    : "font-medium text-[var(--ds-text-primary)]";
  const descriptionLabelClass = useBoldText
    ? "font-semibold text-[var(--ds-text-primary)]"
    : "text-[var(--ds-text-primary)]";
  const amountLabelClass = useBoldText ? "font-semibold" : "font-medium";
  const isRowActive = isSelected || isEditing;
  const rowCellBackgroundClass = budgetRowCellBackgroundClass(row.depth, isRowActive);

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, a")) return;
    onSelectRow(row.rowKey);
  }

  return (
    <TableRow
      className={BUDGET_TABLE_ROW_CLASS}
      onClick={handleRowClick}
      aria-selected={isRowActive}
    >
      <TableCell className={`${BUDGET_CODE_CELL_CLASS} ${rowCellBackgroundClass}`}>
        <div
          className={`${BUDGET_STATIC_VALUE_CLASS} gap-0.5`}
          style={{ paddingLeft: wbsCodeIndent(row.depth) }}
        >
          {hasDescendants ? (
            <button
              type="button"
              className={BUDGET_CHEVRON_BUTTON_CLASS}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} WBS ${row.wbsCode}`}
              onClick={() => onToggleCollapse(row.wbsId)}
            >
              {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
            </button>
          ) : (
            <span className="inline-block w-4 shrink-0" aria-hidden />
          )}
          <span className={`leading-snug ${codeLabelClass}`}>{formatWbsCodeDisplay(row.wbsCode)}</span>
        </div>
      </TableCell>
      <TableCell className={`${BUDGET_DESCRIPTION_CELL_CLASS} ${rowCellBackgroundClass}`}>
        <span className={`${BUDGET_STATIC_VALUE_CLASS} ${descriptionLabelClass}`}>
          {row.wbsDescription}
        </span>
      </TableCell>
      <TableCell className={`${BUDGET_AMOUNT_CELL_CLASS} ${rowCellBackgroundClass}`}>
        {isRollup ? (
          <span
            className={`${BUDGET_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${amountLabelClass} text-[var(--ds-text-primary)]`}
            aria-label={`Roll-up budget amount for WBS ${row.wbsCode}`}
          >
            {formatBudgetAmountRow(row.budgetAmount)}
          </span>
        ) : isEditing ? (
          <div
            className={`${BUDGET_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${amountLabelClass} text-[var(--ds-text-primary)]`}
          >
            <Input
              type="text"
              inputMode="numeric"
              value={formatBudgetAmountEdit(editedValues.budgetAmount)}
              onChange={(event) => {
                if (!budgetId) return;
                onUpdateRow(budgetId, {
                  budgetAmount: parseBudgetAmountInput(event.target.value),
                });
                onClearRowError(budgetId);
              }}
              disabled={rowSaving}
              aria-label={`Budget amount for WBS ${row.wbsCode}`}
              aria-invalid={rowError !== undefined}
              className={BUDGET_AMOUNT_INPUT_CLASS}
            />
          </div>
        ) : (
          <span
            className={`${BUDGET_STATIC_VALUE_CLASS} w-full justify-end tabular-nums ${amountLabelClass} text-[var(--ds-text-primary)]`}
          >
            {formatBudgetAmountRow(displayValues.budgetAmount)}
          </span>
        )}
      </TableCell>
      <TableCell className={`${BUDGET_NOTES_CELL_CLASS} ${rowCellBackgroundClass}`}>
        {isRollup ? (
          <span className={`${BUDGET_STATIC_VALUE_CLASS} text-[var(--ds-text-muted)]`}>
            {row.notes}
          </span>
        ) : isEditing ? (
          <div className="min-w-0">
            <div className={`${BUDGET_STATIC_VALUE_CLASS} min-w-0`}>
              <Input
                value={editedValues.notes}
                onChange={(event) => {
                  if (!budgetId) return;
                  onUpdateRow(budgetId, { notes: event.target.value });
                  onClearRowError(budgetId);
                }}
                disabled={rowSaving}
                aria-label={`Notes for WBS ${row.wbsCode}`}
                aria-invalid={rowError !== undefined}
                placeholder="—"
                className={BUDGET_NOTES_INPUT_CLASS}
              />
            </div>
            {rowError ? (
              <span
                role="alert"
                className="mt-0.5 block truncate text-[length:var(--ds-text-xs)] leading-none text-[var(--ds-status-danger-fg)]"
                title={rowError}
              >
                {rowError}
              </span>
            ) : null}
          </div>
        ) : (
          <span
            className={`${BUDGET_STATIC_VALUE_CLASS} w-full truncate text-[var(--ds-text-muted)]`}
            title={displayValues.notes || undefined}
          >
            {displayValues.notes.trim() ? displayValues.notes : "—"}
          </span>
        )}
      </TableCell>
      <TableCell className={`${BUDGET_ACTIONS_CELL_CLASS} ${rowCellBackgroundClass}`}>
        {isRollup ? (
          <>
            <span className={BUDGET_STATIC_VALUE_CLASS} aria-hidden />
            <span className="sr-only">No actions for roll-up rows</span>
          </>
        ) : directRowForSave && budgetId ? (
          <div className={`${BUDGET_STATIC_VALUE_CLASS} justify-end gap-1`}>
            {isEditing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className={BUDGET_EDIT_SAVE_BUTTON_CLASS}
                  disabled={rowSaving || saving || !dirty}
                  onClick={() => void onSaveRow(directRowForSave)}
                >
                  {rowSaving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={BUDGET_EDIT_CANCEL_BUTTON_CLASS}
                  disabled={rowSaving}
                  onClick={() => onCancelEdit(budgetId)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={BUDGET_TABLE_EDIT_BUTTON_CLASS}
                disabled={rowSaving || saving}
                onClick={() => onStartEdit(budgetId)}
              >
                Edit
              </Button>
            )}
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

type AddBudgetRowDrawerProps = {
  open: boolean;
  saving: boolean;
  wbsOptions: CostBudgetWbsOption[];
  wbsSearch: string;
  selectedWbs: CostBudgetWbsOption | null;
  wbsMatches: CostBudgetWbsOption[];
  draftAmount: string;
  draftNotes: string;
  formError: string | null;
  onWbsSearchChange: (value: string) => void;
  onSelectWbs: (option: CostBudgetWbsOption) => void;
  onDraftAmountChange: (value: string) => void;
  onDraftNotesChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const ADD_BUDGET_DRAWER_TRANSITION_MS = 300;

function AddBudgetRowDrawer({
  open,
  saving,
  wbsOptions,
  wbsSearch,
  selectedWbs,
  wbsMatches,
  draftAmount,
  draftNotes,
  formError,
  onWbsSearchChange,
  onSelectWbs,
  onDraftAmountChange,
  onDraftNotesChange,
  onSubmit,
  onCancel,
}: AddBudgetRowDrawerProps) {
  const wbsBlurTimeoutRef = useRef<number | null>(null);
  const drawerWasOpenRef = useRef(open);
  const [wbsDropdownOpen, setWbsDropdownOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [exitHold, setExitHold] = useState(open);

  const drawerMounted = open || exitHold;

  const wbsDropdownOptions = useMemo(() => {
    const source = selectedWbs || !wbsSearch.trim() ? wbsOptions : wbsMatches;
    return [...source].sort(compareWbsOptions);
  }, [selectedWbs, wbsSearch, wbsOptions, wbsMatches]);

  const showWbsDropdown = open && wbsDropdownOpen && wbsOptions.length > 0;

  useLayoutEffect(() => {
    const wasOpen = drawerWasOpenRef.current;
    drawerWasOpenRef.current = open;

    if (open) {
      let cancelled = false;
      const frame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setExitHold(true);
        setWbsDropdownOpen(false);
        window.requestAnimationFrame(() => {
          if (!cancelled) setDrawerVisible(true);
        });
      });

      return () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
      };
    }

    if (!wasOpen) return undefined;

    let cancelled = false;
    const hideFrame = window.requestAnimationFrame(() => {
      if (!cancelled) setDrawerVisible(false);
    });
    const unmountTimer = window.setTimeout(() => {
      if (!cancelled) setExitHold(false);
    }, ADD_BUDGET_DRAWER_TRANSITION_MS);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(hideFrame);
      window.clearTimeout(unmountTimer);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (wbsBlurTimeoutRef.current !== null) {
        window.clearTimeout(wbsBlurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!drawerMounted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (wbsDropdownOpen) {
          setWbsDropdownOpen(false);
          return;
        }
        if (!saving && open) {
          onCancel();
        }
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerMounted, open, saving, onCancel, wbsDropdownOpen]);

  if (!drawerMounted || typeof document === "undefined") return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleBackdropClick() {
    if (!saving) {
      onCancel();
    }
  }

  function handleWbsSearchChange(value: string) {
    onWbsSearchChange(value);
    setWbsDropdownOpen(true);
  }

  function handleWbsSearchFocus() {
    if (wbsSearch.trim().length > 0) {
      setWbsDropdownOpen(true);
    }
  }

  function handleWbsSearchBlur() {
    wbsBlurTimeoutRef.current = window.setTimeout(() => {
      setWbsDropdownOpen(false);
    }, 150);
  }

  function toggleWbsDropdown() {
    if (saving || wbsOptions.length === 0) return;
    setWbsDropdownOpen((current) => !current);
  }

  function handleSelectWbs(option: CostBudgetWbsOption) {
    if (wbsBlurTimeoutRef.current !== null) {
      window.clearTimeout(wbsBlurTimeoutRef.current);
      wbsBlurTimeoutRef.current = null;
    }
    setWbsDropdownOpen(false);
    onSelectWbs(option);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 ds-modal-backdrop-surface cursor-default border-0 p-0 transition-opacity duration-300 ease-out ${
          drawerVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close add budget row drawer"
        disabled={saving}
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-budget-row-drawer-title"
        className={`relative z-[1] flex h-full w-full max-w-md flex-col border-l border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)] transition-transform duration-300 ease-out ${
          drawerVisible ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-modal-panel-header">
          <h2 id="add-budget-row-drawer-title" className="ds-modal-panel-title">
            Add budget row
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budget-wbs-search">WBS</Label>
                <div className="relative">
                  <Input
                    id="budget-wbs-search"
                    value={wbsSearch}
                    onChange={(event) => handleWbsSearchChange(event.target.value)}
                    onFocus={handleWbsSearchFocus}
                    onBlur={handleWbsSearchBlur}
                    placeholder="Search by WBS code or description"
                    aria-invalid={formError !== null && !selectedWbs}
                    aria-expanded={showWbsDropdown}
                    aria-controls={showWbsDropdown ? "budget-wbs-search-listbox" : undefined}
                    aria-autocomplete="list"
                    role="combobox"
                    autoComplete="off"
                    disabled={wbsOptions.length === 0 || saving}
                    className="!pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-[var(--ds-radius-md)] text-[var(--ds-text-secondary)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ds-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={showWbsDropdown ? "Hide WBS options" : "Show WBS options"}
                    aria-expanded={showWbsDropdown}
                    aria-controls={showWbsDropdown ? "budget-wbs-search-listbox" : undefined}
                    aria-haspopup="listbox"
                    disabled={wbsOptions.length === 0 || saving}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={toggleWbsDropdown}
                  >
                    <span
                      className={`inline-flex transition-transform duration-150 ${showWbsDropdown ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      <IconChevronDown />
                    </span>
                  </button>
                  {showWbsDropdown ? (
                    <div
                      id="budget-wbs-search-listbox"
                      className="absolute inset-x-0 top-full z-[100] mt-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown"
                      role="listbox"
                      aria-label="WBS options"
                    >
                      <div className="max-h-48 overflow-y-auto">
                        {wbsDropdownOptions.length === 0 ? (
                          <p className="m-0 px-[var(--ds-space-4)] py-[var(--ds-space-3)] text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]">
                            No matching WBS rows.
                          </p>
                        ) : (
                          wbsDropdownOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              role="option"
                              aria-selected={selectedWbs?.id === option.id}
                              className="ds-app-menu-dropdown__item truncate text-left"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectWbs(option)}
                            >
                              <span className="font-semibold text-[var(--ds-text-primary)]">
                                {formatWbsCodeDisplay(option.code)}
                              </span>
                              <span className="text-[var(--ds-text-secondary)]"> — {option.description}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                {selectedWbs ? (
                  <p className="m-0 text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
                    Selected:{" "}
                    <span className="font-semibold text-[var(--ds-text-primary)]">
                      {formatWbsCodeDisplay(selectedWbs.code)}
                    </span>
                    <span className="text-[var(--ds-text-secondary)]"> — {selectedWbs.description}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budget-draft-amount">Budget amount</Label>
                <Input
                  id="budget-draft-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={draftAmount}
                  onChange={(event) => onDraftAmountChange(event.target.value)}
                  placeholder="0.00"
                  disabled={saving}
                  aria-invalid={formError !== null && !isValidBudgetAmount(draftAmount)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budget-draft-notes">
                  Notes <span className="font-normal text-[var(--ds-text-secondary)]">(optional)</span>
                </Label>
                <Textarea
                  id="budget-draft-notes"
                  rows={3}
                  value={draftNotes}
                  onChange={(event) => onDraftNotesChange(event.target.value)}
                  placeholder="Assumptions or scope notes"
                  disabled={saving}
                />
              </div>

              {formError ? <FieldError>{formError}</FieldError> : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--ds-border)] px-6 py-4">
            <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add budget row"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

type CostModuleBudgetBodyProps = {
  projectId: string;
  budgetData: CostModuleBudgetData;
  registerToolbar?: (toolbar: ReactNode | null) => void;
};

export function CostModuleBudgetBody({
  projectId,
  budgetData,
  registerToolbar,
}: CostModuleBudgetBodyProps) {
  const router = useRouter();
  const { wbsOptions, budgetRows: initialBudgetRows } = budgetData;

  const [rowPatches, setRowPatches] = useState<
    Record<string, Partial<Pick<BudgetRow, "budgetAmount" | "notes">>>
  >({});
  const [addingRow, setAddingRow] = useState(false);
  const [wbsSearch, setWbsSearch] = useState("");
  const [selectedWbs, setSelectedWbs] = useState<CostBudgetWbsOption | null>(null);
  const [draftAmount, setDraftAmount] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [collapsedWbsIds, setCollapsedWbsIds] = useState<Set<string>>(() => new Set());
  const [editingBudgetIds, setEditingBudgetIds] = useState<Set<string>>(() => new Set());
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const serverRowById = useMemo(
    () => new Map(initialBudgetRows.map((row) => [row.id, row])),
    [initialBudgetRows],
  );

  const directBudgetRows = useMemo(
    () => initialBudgetRows.map((row) => ({ ...row, ...rowPatches[row.id] })),
    [initialBudgetRows, rowPatches],
  );

  const displayRows = useMemo(
    () => buildBudgetDisplayRows(wbsOptions, directBudgetRows),
    [wbsOptions, directBudgetRows],
  );

  const parentByWbsId = useMemo(() => buildParentWbsIdMap(wbsOptions), [wbsOptions]);

  const visibleDisplayRows = useMemo(
    () => filterVisibleBudgetDisplayRows(displayRows, collapsedWbsIds, parentByWbsId),
    [displayRows, collapsedWbsIds, parentByWbsId],
  );

  const hasDescendantsByWbsId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of displayRows) {
      map.set(row.wbsId, displayRowHasVisibleDescendants(row, displayRows));
    }
    return map;
  }, [displayRows]);

  const directBudgetTotal = useMemo(
    () => sumDirectBudgetAmounts(directBudgetRows),
    [directBudgetRows],
  );

  function toggleWbsCollapse(wbsId: string) {
    setCollapsedWbsIds((current) => {
      const next = new Set(current);
      if (next.has(wbsId)) {
        next.delete(wbsId);
      } else {
        next.add(wbsId);
      }
      return next;
    });
  }

  function startEditing(budgetId: string) {
    setEditingBudgetIds((current) => new Set(current).add(budgetId));
  }

  function stopEditing(budgetId: string) {
    setEditingBudgetIds((current) => {
      const next = new Set(current);
      next.delete(budgetId);
      return next;
    });
  }

  function getDirectRowDisplayValues(budgetId: string) {
    const server = serverRowById.get(budgetId);
    return {
      budgetAmount: server?.budgetAmount ?? "",
      notes: server?.notes ?? "",
    };
  }

  function getDirectRowEditedValues(budgetId: string) {
    const server = serverRowById.get(budgetId);
    const patch = rowPatches[budgetId];
    return {
      budgetAmount: patch?.budgetAmount ?? server?.budgetAmount ?? "",
      notes: patch?.notes ?? server?.notes ?? "",
    };
  }

  function cancelEditing(budgetId: string) {
    clearRowPatch(budgetId);
    stopEditing(budgetId);
    setRowErrors((current) => {
      if (!current[budgetId]) return current;
      const next = { ...current };
      delete next[budgetId];
      return next;
    });
  }

  const hasWbs = wbsOptions.length > 0;

  const wbsMatches = useMemo(
    () => filterWbsOptions(wbsOptions, wbsSearch),
    [wbsOptions, wbsSearch],
  );

  function resetAddForm() {
    setWbsSearch("");
    setSelectedWbs(null);
    setDraftAmount("");
    setDraftNotes("");
    setFormError(null);
  }

  const openAddForm = useCallback(() => {
    if (!hasWbs) return;
    setWbsSearch("");
    setSelectedWbs(null);
    setDraftAmount("");
    setDraftNotes("");
    setFormError(null);
    setAddingRow(true);
  }, [hasWbs]);

  function cancelAddForm() {
    setAddingRow(false);
    resetAddForm();
  }

  async function handleAddRow() {
    if (!selectedWbs) {
      setFormError("Select a WBS row by code or description.");
      return;
    }
    if (!isValidBudgetAmount(draftAmount)) {
      setFormError("Enter a valid budget amount.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wbsId: selectedWbs.id,
          originalBudget: draftAmount.trim(),
          notes: draftNotes,
        }),
      });

      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        duplicateWbs?: boolean;
      };

      if (!response.ok) {
        setFormError(json.error ?? "Could not save budget row. Please try again.");
        return;
      }

      setAddingRow(false);
      resetAddForm();
      router.refresh();
    } catch {
      setFormError("Could not save budget row. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateRow(id: string, patch: Partial<Pick<BudgetRow, "budgetAmount" | "notes">>) {
    setRowPatches((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  function clearRowPatch(id: string) {
    setRowPatches((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function handleSaveRow(row: BudgetRow) {
    if (!isValidBudgetAmount(row.budgetAmount)) {
      setRowErrors((current) => ({
        ...current,
        [row.id]: "Enter a valid budget amount.",
      }));
      return;
    }

    setSavingRowId(row.id);
    setRowErrors((current) => {
      if (!current[row.id]) return current;
      const next = { ...current };
      delete next[row.id];
      return next;
    });

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/budgets/${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            originalBudget: row.budgetAmount.trim(),
            notes: row.notes,
          }),
        },
      );

      const json = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setRowErrors((current) => ({
          ...current,
          [row.id]: json.error ?? "Could not save budget changes. Please try again.",
        }));
        return;
      }

      clearRowPatch(row.id);
      stopEditing(row.id);
      router.refresh();
    } catch {
      setRowErrors((current) => ({
        ...current,
        [row.id]: "Could not save budget changes. Please try again.",
      }));
    } finally {
      setSavingRowId(null);
    }
  }

  const toolbar = useMemo(
    () => (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Button type="button" onClick={openAddForm} disabled={!hasWbs}>
          Add Budget Row
        </Button>
      </div>
    ),
    [hasWbs, openAddForm],
  );

  useLayoutEffect(() => {
    if (!registerToolbar) return;
    registerToolbar(toolbar);
    return () => registerToolbar(null);
  }, [registerToolbar, toolbar]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!hasWbs ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--ds-radius-md)] border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-4 py-8 text-center">
          <p className="m-0 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
            No approved WBS has been loaded for this project. Configure the WBS in project settings.
          </p>
        </div>
      ) : null}

      <AddBudgetRowDrawer
        open={addingRow}
        saving={saving}
        wbsOptions={wbsOptions}
        wbsSearch={wbsSearch}
        selectedWbs={selectedWbs}
        wbsMatches={wbsMatches}
        draftAmount={draftAmount}
        draftNotes={draftNotes}
        formError={formError}
        onWbsSearchChange={(value) => {
          setWbsSearch(value);
          setSelectedWbs(null);
          setFormError(null);
        }}
        onSelectWbs={(option) => {
          setSelectedWbs(option);
          setWbsSearch(`${formatWbsCodeDisplay(option.code)} — ${option.description}`);
          setFormError(null);
        }}
        onDraftAmountChange={(value) => {
          setDraftAmount(value);
          setFormError(null);
        }}
        onDraftNotesChange={setDraftNotes}
        onSubmit={() => void handleAddRow()}
        onCancel={cancelAddForm}
      />

      <div className="min-w-0 overflow-x-auto rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)]">
        <Table className="w-full table-fixed text-[length:var(--ds-text-xs)] [&_th]:!py-0.5 [&_td]:!py-0">
          <TableHead>
            <TableRow className={BUDGET_TABLE_ROW_CLASS}>
              <TableHeaderCell className={`${BUDGET_TABLE_HEADER_CELL_CLASS} w-[120px] max-w-[120px] whitespace-nowrap`}>
                WBS Code
              </TableHeaderCell>
              <TableHeaderCell className={BUDGET_TABLE_HEADER_CELL_CLASS}>
                WBS Description
              </TableHeaderCell>
              <TableHeaderCell className={BUDGET_AMOUNT_HEADER_CLASS}>Budget</TableHeaderCell>
              <TableHeaderCell className={BUDGET_TABLE_HEADER_CELL_CLASS}>Notes</TableHeaderCell>
              <TableHeaderCell className={BUDGET_ACTIONS_HEADER_CLASS}>
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow className={BUDGET_TABLE_ROW_CLASS}>
                <TableCell
                  colSpan={5}
                  className={`${BUDGET_TABLE_CELL_CLASS} py-4 text-center text-[var(--ds-text-secondary)]`}
                >
                  {hasWbs
                    ? "No budget rows yet. Add a row to set budget against the WBS structure."
                    : "No budget rows yet. Configure the approved WBS in project settings before adding budget lines."}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {visibleDisplayRows.map((row) => {
                  const budgetId = row.budgetId;
                  return (
                    <BudgetTableDisplayRow
                      key={row.rowKey}
                      row={row}
                      hasDescendants={hasDescendantsByWbsId.get(row.wbsId) ?? false}
                      isExpanded={!collapsedWbsIds.has(row.wbsId)}
                      isEditing={budgetId ? editingBudgetIds.has(budgetId) : false}
                      isSelected={selectedRowKey === row.rowKey}
                      onSelectRow={setSelectedRowKey}
                      onToggleCollapse={toggleWbsCollapse}
                      onStartEdit={(id) => {
                        setSelectedRowKey(row.rowKey);
                        startEditing(id);
                      }}
                      onCancelEdit={cancelEditing}
                      displayValues={
                        budgetId ? getDirectRowDisplayValues(budgetId) : { budgetAmount: "", notes: "" }
                      }
                      editedValues={
                        budgetId ? getDirectRowEditedValues(budgetId) : { budgetAmount: "", notes: "" }
                      }
                      serverRowById={serverRowById}
                      rowErrors={rowErrors}
                      saving={saving}
                      savingRowId={savingRowId}
                      onUpdateRow={updateRow}
                      onSaveRow={handleSaveRow}
                      onClearRowError={(id) => {
                        if (!rowErrors[id]) return;
                        setRowErrors((current) => {
                          const next = { ...current };
                          delete next[id];
                          return next;
                        });
                      }}
                    />
                  );
                })}
                <TableRow className={BUDGET_PROJECT_TOTAL_ROW_CLASS}>
                  <TableCell className={BUDGET_CODE_CELL_CLASS} colSpan={2}>
                    <span
                      className={`${BUDGET_STATIC_VALUE_CLASS} text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]`}
                    >
                      Project total
                    </span>
                  </TableCell>
                  <TableCell className={BUDGET_AMOUNT_CELL_CLASS}>
                    <span
                      className={`${BUDGET_STATIC_VALUE_CLASS} w-full justify-end text-[length:var(--ds-text-sm)] font-semibold tabular-nums text-[var(--ds-text-primary)]`}
                      aria-label="Project total budget amount"
                    >
                      {formatBudgetAmountDisplay(String(directBudgetTotal))}
                    </span>
                  </TableCell>
                  <TableCell className={BUDGET_NOTES_CELL_CLASS}>
                    <span className={`${BUDGET_STATIC_VALUE_CLASS} text-[var(--ds-text-muted)]`} aria-hidden />
                  </TableCell>
                  <TableCell className={BUDGET_ACTIONS_CELL_CLASS}>
                    <span className={BUDGET_STATIC_VALUE_CLASS} aria-hidden />
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
