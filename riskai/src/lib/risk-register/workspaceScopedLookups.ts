import { isPostgresUniqueViolation } from "@/lib/workspace/workspaceSlug";

/**
 * Workspace-scoped Risk Owner / Category lookups.
 * Live tables `riskai_project_owners` and `riskai_risk_categories` are keyed by
 * `workspace_id` (shared across projects in the workspace). Risk rows keep free-text
 * `owner` / `category` values — no FKs to lookup rows.
 */

export function workspaceIdFromVisualifyProjectRow(
  row: { workspace_id?: unknown } | null | undefined
): string | null {
  const raw = row?.workspace_id;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Active owners for one workspace — never filter by removed `project_id`. */
export function workspaceScopedOwnerListEq(workspaceId: string): {
  workspace_id: string;
  is_active: true;
} {
  return { workspace_id: workspaceId.trim(), is_active: true };
}

/** Insert payload for a workspace-scoped owner label. */
export function workspaceScopedOwnerInsert(
  workspaceId: string,
  name: string
): { workspace_id: string; name: string } {
  return { workspace_id: workspaceId.trim(), name: name.trim() };
}

/** Active categories for one workspace — never load as a global unscoped list. */
export function workspaceScopedCategoryListEq(workspaceId: string): {
  workspace_id: string;
  is_active: true;
} {
  return { workspace_id: workspaceId.trim(), is_active: true };
}

/** Insert payload for a workspace-scoped category label — never includes `project_id`. */
export function workspaceScopedCategoryInsert(
  workspaceId: string,
  name: string
): { workspace_id: string; name: string; is_active: true } {
  return {
    workspace_id: workspaceId.trim(),
    name: name.trim(),
    is_active: true,
  };
}

/**
 * Same workspace → identical owner/category list filters (shared across projects).
 * Different workspaces → isolated filters.
 */
export function workspaceLookupFiltersMatch(
  workspaceIdA: string,
  workspaceIdB: string
): boolean {
  const a = workspaceIdA.trim();
  const b = workspaceIdB.trim();
  return a.length > 0 && a === b;
}

/** Trimmed non-empty lookup name, or null when blank/whitespace-only. */
export function normalizeLookupName(raw: string): string | null {
  const name = raw.trim();
  return name.length > 0 ? name : null;
}

/**
 * Case-insensitive match after trim; returns the existing name's casing when found.
 * Used before Category insert so duplicates reuse the shared workspace row.
 */
export function findLookupNameCaseInsensitive(
  existingNames: readonly string[],
  candidate: string
): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  const needle = trimmed.toLowerCase();
  for (const name of existingNames) {
    if (name.trim().toLowerCase() === needle) return name;
  }
  return null;
}

export type ResolveCreateLookupNameResult =
  | { action: "reject_blank" }
  | { action: "reuse"; name: string }
  | { action: "insert"; name: string };

/** Decide whether to reject, reuse an existing label, or insert a new trimmed name. */
export function resolveCreateLookupName(
  existingNames: readonly string[],
  rawName: string
): ResolveCreateLookupNameResult {
  const name = normalizeLookupName(rawName);
  if (!name) return { action: "reject_blank" };
  const existing = findLookupNameCaseInsensitive(existingNames, name);
  if (existing) return { action: "reuse", name: existing };
  return { action: "insert", name };
}

/** Controlled duplicate handling for normalized unique owner/category names. */
export function shouldIgnoreLookupUniqueViolation(err: unknown): boolean {
  if (isPostgresUniqueViolation(err)) return true;
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : typeof err === "string"
        ? err
        : "";
  return /duplicate key|unique constraint/i.test(message);
}
