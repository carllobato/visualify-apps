/**
 * Shared Excel file-import normalisation, duplicate classification, and preview selection.
 * Used by CreateRiskFileModal and ProjectExcelUploadSection only.
 */

import type { Risk, RiskDraft } from "./risk.schema";
import { RiskDraftSchema } from "./risk.schema";
import { draftToRisk } from "./risk.mapper";
import { normalizeRiskStatusKey, resolveCanonicalCategoryLabel } from "./riskFieldSemantics";

/** Categories the Excel extract prompt recognises; used when workspace lookup names are unavailable. */
export const FILE_IMPORT_CATEGORY_CANDIDATES = [
  "commercial",
  "programme",
  "design",
  "construction",
  "procurement",
  "hse",
  "authority",
  "operations",
  "other",
] as const;

export type ImportDuplicateReason = "existing_project" | "batch";

export type ImportPreviewRow = {
  id: string;
  /** Display title (trimmed when present). */
  title: string;
  risk: Risk | null;
  valid: boolean;
  invalidReason?: string;
  isDuplicate: boolean;
  duplicateReasons: ImportDuplicateReason[];
  defaultSelected: boolean;
  /** Short detail string for preview table (category, owner, mitigation snippet). */
  detail: string;
};

export type ImportPreviewSummary = {
  totalExtracted: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  uniqueValidCount: number;
  selectedCount: number;
};

export type ImportConfirmationCounts = {
  imported: number;
  skippedDuplicate: number;
  invalid: number;
  skipped: number;
};

function trimText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

/** Normalised title key for duplicate comparison (trim, collapse whitespace, case-insensitive). */
export function normalizeImportTitleKey(title: string): string {
  return collapseWhitespace(trimText(title)).toLowerCase();
}

function clampRiskScale(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function isDraftLike(item: Record<string, unknown>): boolean {
  return (
    typeof item.probability === "number" &&
    typeof item.consequence === "number" &&
    item.inherentRating === undefined
  );
}

function mapImportCategory(raw: string, categoryNames?: string[]): string {
  const trimmed = trimText(raw);
  if (!trimmed) return "";
  const candidates =
    categoryNames && categoryNames.length > 0 ? categoryNames : [...FILE_IMPORT_CATEGORY_CANDIDATES];
  const resolved = resolveCanonicalCategoryLabel(trimmed, candidates);
  const resolvedKey = normalizeRiskStatusKey(resolved);
  const matched = candidates.some((c) => normalizeRiskStatusKey(c) === resolvedKey);
  return matched ? resolved : "";
}

function buildPreviewDetail(draft: {
  category?: string;
  owner?: string;
  mitigation?: string;
  probability?: number;
  consequence?: number;
}): string {
  const parts: string[] = [];
  if (draft.category) parts.push(`Category: ${draft.category}`);
  if (draft.owner) parts.push(`Owner: ${draft.owner}`);
  if (draft.probability != null && draft.consequence != null) {
    parts.push(`P${draft.probability} × C${draft.consequence}`);
  }
  if (draft.mitigation) {
    const m = draft.mitigation.length > 80 ? `${draft.mitigation.slice(0, 77)}…` : draft.mitigation;
    parts.push(`Mitigation: ${m}`);
  }
  return parts.join(" · ") || "—";
}

function normalizeDraftItem(
  item: Record<string, unknown>,
  options?: { categoryNames?: string[] },
): { draft: RiskDraft | null; invalidReason?: string; displayTitle: string } {
  const displayTitle = collapseWhitespace(trimText(item.title));
  if (!displayTitle) {
    return { draft: null, invalidReason: "Missing title", displayTitle: "" };
  }

  const probability = clampRiskScale(item.probability);
  const consequence = clampRiskScale(item.consequence);
  if (probability == null || consequence == null) {
    return { draft: null, invalidReason: "Invalid probability or consequence", displayTitle };
  }

  const owner = trimText(item.owner);
  const mitigation = trimText(item.mitigation);
  const category = mapImportCategory(trimText(item.category), options?.categoryNames);

  const candidate: RiskDraft = {
    title: displayTitle,
    category,
    probability,
    consequence,
    ...(owner ? { owner } : {}),
    ...(mitigation ? { mitigation } : {}),
  };

  const parsed = RiskDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    return { draft: null, invalidReason: "Could not parse extracted row", displayTitle };
  }

  return { draft: parsed.data, displayTitle };
}

/**
 * Map raw extract API rows through the draft mapper only.
 * Never uses RiskSchema passthrough — imported risks always become Draft in-memory.
 */
export function normalizeExtractedImportRisks(
  raw: unknown,
  options?: { categoryNames?: string[] },
): Array<{
  risk: Risk | null;
  valid: boolean;
  invalidReason?: string;
  displayTitle: string;
  detail: string;
}> {
  const list = Array.isArray(raw) ? raw : [];
  const rows: Array<{
    risk: Risk | null;
    valid: boolean;
    invalidReason?: string;
    displayTitle: string;
    detail: string;
  }> = [];

  for (const item of list) {
    if (!item || typeof item !== "object") {
      rows.push({
        risk: null,
        valid: false,
        invalidReason: "Unrecognised row",
        displayTitle: "",
        detail: "—",
      });
      continue;
    }

    const record = item as Record<string, unknown>;

    if (!isDraftLike(record)) {
      const title = collapseWhitespace(trimText(record.title));
      rows.push({
        risk: null,
        valid: false,
        invalidReason: title ? "Unrecognised row format" : "Missing title",
        displayTitle: title,
        detail: "—",
      });
      continue;
    }

    const normalized = normalizeDraftItem(record, options);
    if (!normalized.draft) {
      rows.push({
        risk: null,
        valid: false,
        invalidReason: normalized.invalidReason,
        displayTitle: normalized.displayTitle,
        detail: "—",
      });
      continue;
    }

    const risk = draftToRisk(normalized.draft);
    rows.push({
      risk,
      valid: true,
      displayTitle: normalized.displayTitle,
      detail: buildPreviewDetail(normalized.draft),
    });
  }

  return rows;
}

/** Classify duplicates against current-project risks and within the upload batch. */
export function classifyImportPreviewRows(
  normalizedRows: Array<{
    risk: Risk | null;
    valid: boolean;
    invalidReason?: string;
    displayTitle: string;
    detail: string;
  }>,
  existingProjectRisks: Risk[],
): ImportPreviewRow[] {
  const existingKeys = new Set(
    existingProjectRisks.map((r) => normalizeImportTitleKey(String(r.title ?? ""))),
  );
  const batchSeen = new Set<string>();

  return normalizedRows.map((row, index) => {
    const id = row.valid && row.risk ? row.risk.id : `invalid-${index}`;

    if (!row.valid || !row.risk) {
      return {
        id,
        title: row.displayTitle || "(no title)",
        risk: null,
        valid: false,
        invalidReason: row.invalidReason ?? "Invalid row",
        isDuplicate: false,
        duplicateReasons: [],
        defaultSelected: false,
        detail: row.detail,
      };
    }

    const key = normalizeImportTitleKey(row.risk.title);
    const duplicateReasons: ImportDuplicateReason[] = [];
    if (existingKeys.has(key)) duplicateReasons.push("existing_project");
    if (batchSeen.has(key)) duplicateReasons.push("batch");
    batchSeen.add(key);

    const isDuplicate = duplicateReasons.length > 0;
    return {
      id,
      title: row.displayTitle,
      risk: row.risk,
      valid: true,
      isDuplicate,
      duplicateReasons,
      defaultSelected: !isDuplicate,
      detail: row.detail,
    };
  });
}

export function buildFileImportPreview(
  raw: unknown,
  existingProjectRisks: Risk[],
  options?: { categoryNames?: string[] },
): ImportPreviewRow[] {
  const normalized = normalizeExtractedImportRisks(raw, options);
  return classifyImportPreviewRows(normalized, existingProjectRisks);
}

export function getDefaultImportSelection(rows: ImportPreviewRow[]): Set<string> {
  return new Set(rows.filter((r) => r.valid && r.defaultSelected).map((r) => r.id));
}

export function getImportPreviewSummary(
  rows: ImportPreviewRow[],
  selectedIds: ReadonlySet<string>,
): ImportPreviewSummary {
  const validRows = rows.filter((r) => r.valid);
  return {
    totalExtracted: rows.length,
    validCount: validRows.length,
    invalidCount: rows.filter((r) => !r.valid).length,
    duplicateCount: validRows.filter((r) => r.isDuplicate).length,
    uniqueValidCount: validRows.filter((r) => !r.isDuplicate).length,
    selectedCount: validRows.filter((r) => selectedIds.has(r.id)).length,
  };
}

export function resolveImportSelection(
  rows: ImportPreviewRow[],
  selectedIds: ReadonlySet<string>,
): { risksToAppend: Risk[]; counts: ImportConfirmationCounts } {
  const validRows = rows.filter((r) => r.valid && r.risk);
  const selectedValid = validRows.filter((r) => selectedIds.has(r.id));
  const unselectedValid = validRows.filter((r) => !selectedIds.has(r.id));

  return {
    risksToAppend: selectedValid.map((r) => r.risk!),
    counts: {
      imported: selectedValid.length,
      skippedDuplicate: unselectedValid.filter((r) => r.isDuplicate).length,
      invalid: rows.filter((r) => !r.valid).length,
      skipped: unselectedValid.length,
    },
  };
}

export function formatImportConfirmationMessage(counts: ImportConfirmationCounts): string {
  const parts: string[] = [];
  if (counts.imported > 0) {
    parts.push(`Imported ${counts.imported} risk${counts.imported === 1 ? "" : "s"}`);
  }
  if (counts.skippedDuplicate > 0) {
    parts.push(
      `skipped ${counts.skippedDuplicate} possible duplicate${counts.skippedDuplicate === 1 ? "" : "s"}`,
    );
  }
  if (counts.invalid > 0) {
    parts.push(`${counts.invalid} invalid row${counts.invalid === 1 ? "" : "s"} dropped`);
  }
  if (counts.skipped > 0 && counts.skipped !== counts.skippedDuplicate) {
    parts.push(`${counts.skipped} row${counts.skipped === 1 ? "" : "s"} not selected`);
  }
  return parts.length > 0 ? parts.join("; ") + "." : "No risks imported.";
}
