import "server-only";

import { notFound } from "next/navigation";
import {
  requireAccessibleControlAIProject,
  resolveAccessibleControlAIProject,
} from "@/lib/controlai-project-access";
import type {
  CostBudgetTableRow,
  CostBudgetWbsOption,
  CostModuleBudgetData,
} from "@/lib/cost/cost-budget-types";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseServerClient } from "@/lib/supabase/server";
import {
  APPROVED_COST_WBS_TEMPLATE,
  parentCodeForApprovedWbs,
} from "@/lib/cost/cost-wbs-template";
import { resolveActiveWorkspaceContext } from "@/lib/workspace/resolveActiveWorkspace";

const WBS_SELECT = "id, code, description, sort_order, parent_wbs_id" as const;
const BUDGET_SELECT =
  "id, wbs_id, original_budget, notes, costai_wbs ( code, description )" as const;

type CostaiWbsRow = {
  id: string;
  code: string;
  description: string | null;
  sort_order: number | null;
  parent_wbs_id: string | null;
};

type CostaiBudgetRow = {
  id: string;
  wbs_id: string;
  original_budget: number | string | null;
  notes: string | null;
  costai_wbs:
    | { code: string; description: string | null }
    | { code: string; description: string | null }[]
    | null;
};

function formatBudgetAmount(value: number | string | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function wbsLabelFromJoin(
  wbsId: string,
  joined: CostaiBudgetRow["costai_wbs"],
  wbsById: Map<string, CostBudgetWbsOption>,
): { code: string; description: string } {
  const embedded = Array.isArray(joined) ? joined[0] : joined;
  if (embedded?.code) {
    return {
      code: embedded.code,
      description: embedded.description ?? "",
    };
  }

  const fallback = wbsById.get(wbsId);
  if (fallback) {
    return { code: fallback.code, description: fallback.description };
  }

  return { code: "—", description: "" };
}

function rowToWbsOption(row: CostaiWbsRow): CostBudgetWbsOption {
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? "",
    parentWbsId: row.parent_wbs_id ?? null,
    sortOrder: row.sort_order ?? null,
  };
}

function mapBudgetRow(
  row: CostaiBudgetRow,
  wbsById: Map<string, CostBudgetWbsOption>,
): CostBudgetTableRow {
  const { code, description } = wbsLabelFromJoin(row.wbs_id, row.costai_wbs, wbsById);
  return {
    id: row.id,
    wbsId: row.wbs_id,
    wbsCode: code,
    wbsDescription: description,
    budgetAmount: formatBudgetAmount(row.original_budget),
    notes: row.notes ?? "",
  };
}

function mapBudgetRows(
  budgets: CostaiBudgetRow[],
  wbsById: Map<string, CostBudgetWbsOption>,
): CostBudgetTableRow[] {
  return budgets.map((row) => mapBudgetRow(row, wbsById));
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "23505") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("unique") && message.includes("wbs_id");
}

function isWbsCodeUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "23505") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("unique") && message.includes("code");
}

type WbsParentRow = { id: string; parent_wbs_id: string | null };

type BudgetWbsCodeRow = {
  wbs_id: string;
  costai_wbs:
    | { code: string }
    | { code: string }[]
    | null;
};

function buildParentWbsIdMap(rows: WbsParentRow[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const row of rows) {
    map.set(row.id, row.parent_wbs_id ?? null);
  }
  return map;
}

function budgetWbsCodeFromJoin(joined: BudgetWbsCodeRow["costai_wbs"]): string | null {
  const embedded = Array.isArray(joined) ? joined[0] : joined;
  return embedded?.code ?? null;
}

/** True when any ancestor WBS (via parent_wbs_id) already has a budget. */
function hasBudgetOnAncestorWbs(
  selectedWbsId: string,
  parentByWbsId: Map<string, string | null>,
  budgetedWbsIds: Set<string>,
): boolean {
  let parentId = parentByWbsId.get(selectedWbsId) ?? null;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    if (budgetedWbsIds.has(parentId)) return true;
    parentId = parentByWbsId.get(parentId) ?? null;
  }

  return false;
}

/** True when any budgeted WBS code is a descendant of the selected code (code + '.'). */
function hasBudgetOnDescendantWbs(selectedWbsCode: string, budgetedWbsCodes: string[]): boolean {
  const descendantPrefix = `${selectedWbsCode}.`;
  return budgetedWbsCodes.some((code) => code.startsWith(descendantPrefix));
}

function hasWbsHierarchyBudgetConflict(
  selectedWbsId: string,
  selectedWbsCode: string,
  wbsRows: WbsParentRow[],
  budgetRows: BudgetWbsCodeRow[],
): boolean {
  const budgetedWbsIds = new Set<string>();
  const budgetedWbsCodes: string[] = [];

  for (const row of budgetRows) {
    budgetedWbsIds.add(row.wbs_id);
    const code = budgetWbsCodeFromJoin(row.costai_wbs);
    if (code) budgetedWbsCodes.push(code);
  }

  if (budgetedWbsIds.size === 0) return false;

  const parentByWbsId = buildParentWbsIdMap(wbsRows);

  return (
    hasBudgetOnAncestorWbs(selectedWbsId, parentByWbsId, budgetedWbsIds) ||
    hasBudgetOnDescendantWbs(selectedWbsCode, budgetedWbsCodes)
  );
}

export type SeedCostWbsTemplateResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

const HIERARCHY_BUDGET_CONFLICT_MESSAGE =
  "Budget already exists on a parent or child WBS. Remove or adjust that budget before adding this one.";

export type CreateCostBudgetResult =
  | { ok: true; row: CostBudgetTableRow }
  | { ok: false; error: string; duplicateWbs?: boolean; hierarchyConflict?: boolean };

export type UpdateCostBudgetResult =
  | { ok: true; row: CostBudgetTableRow }
  | { ok: false; error: string; notFound?: boolean };

export function parseOriginalBudget(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Seeds the approved WBS template for a project (authenticated client / RLS).
 * Skips codes that already exist; does not delete or update existing rows.
 */
export async function seedCostaiWbsTemplate(projectId: string): Promise<SeedCostWbsTemplateResult> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to load the WBS template." };
  }

  const project = await resolveAccessibleControlAIProject(supabase, user.id, projectId);
  if (!project) {
    return { ok: false, error: "You do not have access to this project." };
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);
  const workspaceId = workspaceContext.selectedWorkspaceId?.trim() ?? "";
  if (!workspaceId) {
    return { ok: false, error: "Select a workspace before loading the WBS template." };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("costai_wbs")
    .select("id, code")
    .eq("project_id", projectId);

  if (existingError) {
    console.error("[controlai] seedCostaiWbsTemplate load existing", existingError.message);
    return { ok: false, error: "Could not read existing WBS for this project." };
  }

  const codeToId = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (typeof row.code === "string" && typeof row.id === "string") {
      codeToId.set(row.code, row.id);
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (let index = 0; index < APPROVED_COST_WBS_TEMPLATE.length; index += 1) {
    const entry = APPROVED_COST_WBS_TEMPLATE[index]!;

    if (codeToId.has(entry.code)) {
      skipped += 1;
      continue;
    }

    const parentCode = parentCodeForApprovedWbs(entry.code);
    const parentWbsId = parentCode ? (codeToId.get(parentCode) ?? null) : null;

    if (parentCode && !parentWbsId) {
      console.error("[controlai] seedCostaiWbsTemplate missing parent", {
        code: entry.code,
        parentCode,
      });
      return {
        ok: false,
        error: `Could not resolve parent WBS "${parentCode}" for code "${entry.code}".`,
      };
    }

    const { data: created, error: insertError } = await supabase
      .from("costai_wbs")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        parent_wbs_id: parentWbsId,
        code: entry.code,
        description: entry.description,
        sort_order: index,
        is_active: true,
      })
      .select("id, code")
      .single();

    if (insertError) {
      if (isWbsCodeUniqueViolation(insertError)) {
        const { data: raced } = await supabase
          .from("costai_wbs")
          .select("id, code")
          .eq("project_id", projectId)
          .eq("code", entry.code)
          .maybeSingle();

        if (raced?.id && raced.code) {
          codeToId.set(raced.code, raced.id);
          skipped += 1;
          continue;
        }
      }
      console.error("[controlai] seedCostaiWbsTemplate insert", insertError.message);
      return { ok: false, error: "Could not load WBS template. Please try again." };
    }

    if (!created?.id || !created.code) {
      return { ok: false, error: "Could not load WBS template. Please try again." };
    }

    codeToId.set(created.code, created.id);
    inserted += 1;
  }

  return { ok: true, inserted, skipped };
}

/**
 * Inserts a budget row for the project using the authenticated Supabase client (RLS).
 */
export async function createCostaiBudget(
  projectId: string,
  input: { wbsId: string; originalBudget: number; notes: string },
): Promise<CreateCostBudgetResult> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to add a budget row." };
  }

  const project = await resolveAccessibleControlAIProject(supabase, user.id, projectId);
  if (!project) {
    return { ok: false, error: "You do not have access to this project." };
  }

  const wbsId = input.wbsId.trim();
  if (!wbsId) {
    return { ok: false, error: "Select a WBS row by code or description." };
  }

  if (!Number.isFinite(input.originalBudget)) {
    return { ok: false, error: "Enter a valid budget amount." };
  }

  const { data: wbsRow, error: wbsError } = await supabase
    .from("costai_wbs")
    .select("id, project_id, workspace_id, code, description")
    .eq("id", wbsId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (wbsError) {
    console.error("[controlai] createCostaiBudget wbs lookup", wbsError.message);
    return { ok: false, error: "Could not validate WBS selection." };
  }

  if (!wbsRow) {
    return { ok: false, error: "Selected WBS is not valid for this project." };
  }

  const { data: existingBudget, error: existingError } = await supabase
    .from("costai_budgets")
    .select("id")
    .eq("wbs_id", wbsId)
    .maybeSingle();

  if (existingError) {
    console.error("[controlai] createCostaiBudget duplicate check", existingError.message);
    return { ok: false, error: "Could not verify existing budgets." };
  }

  if (existingBudget) {
    return {
      ok: false,
      error: "A budget already exists for this WBS.",
      duplicateWbs: true,
    };
  }

  const [wbsHierarchyResult, budgetsHierarchyResult] = await Promise.all([
    supabase.from("costai_wbs").select("id, parent_wbs_id").eq("project_id", projectId),
    supabase
      .from("costai_budgets")
      .select("wbs_id, costai_wbs ( code )")
      .eq("project_id", projectId),
  ]);

  if (wbsHierarchyResult.error || budgetsHierarchyResult.error) {
    console.error("[controlai] createCostaiBudget hierarchy check", {
      wbsError: wbsHierarchyResult.error?.message,
      budgetsError: budgetsHierarchyResult.error?.message,
    });
    return { ok: false, error: "Could not verify existing budgets." };
  }

  if (
    hasWbsHierarchyBudgetConflict(
      wbsId,
      wbsRow.code,
      (wbsHierarchyResult.data ?? []) as WbsParentRow[],
      (budgetsHierarchyResult.data ?? []) as BudgetWbsCodeRow[],
    )
  ) {
    return {
      ok: false,
      error: HIERARCHY_BUDGET_CONFLICT_MESSAGE,
      hierarchyConflict: true,
    };
  }

  const workspaceContext = await resolveActiveWorkspaceContext(supabase, user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId?.trim() ?? "";
  const workspaceId =
    typeof wbsRow.workspace_id === "string" && wbsRow.workspace_id.trim().length > 0
      ? wbsRow.workspace_id.trim()
      : activeWorkspaceId;

  if (!workspaceId) {
    return { ok: false, error: "Select a workspace before adding a budget row." };
  }

  const notes = input.notes.trim();

  const { data: inserted, error: insertError } = await supabase
    .from("costai_budgets")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      wbs_id: wbsId,
      original_budget: input.originalBudget,
      notes: notes.length > 0 ? notes : null,
    })
    .select(BUDGET_SELECT)
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError)) {
      return {
        ok: false,
        error: "A budget already exists for this WBS.",
        duplicateWbs: true,
      };
    }
    console.error("[controlai] createCostaiBudget insert", insertError.message);
    return { ok: false, error: "Could not save budget row. Please try again." };
  }

  if (!inserted) {
    return { ok: false, error: "Could not save budget row. Please try again." };
  }

  const wbsById = new Map<string, CostBudgetWbsOption>([
    [
      wbsRow.id,
      {
        id: wbsRow.id,
        code: wbsRow.code,
        description: wbsRow.description ?? "",
        parentWbsId: null,
        sortOrder: null,
      },
    ],
  ]);

  return { ok: true, row: mapBudgetRow(inserted as CostaiBudgetRow, wbsById) };
}

/**
 * Updates original_budget and notes for an existing project budget (authenticated client / RLS).
 */
export async function updateCostaiBudget(
  projectId: string,
  budgetId: string,
  input: { originalBudget: number; notes: string },
): Promise<UpdateCostBudgetResult> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to save budget changes." };
  }

  const project = await resolveAccessibleControlAIProject(supabase, user.id, projectId);
  if (!project) {
    return { ok: false, error: "You do not have access to this project." };
  }

  const trimmedBudgetId = budgetId.trim();
  if (!trimmedBudgetId) {
    return { ok: false, error: "Invalid budget row.", notFound: true };
  }

  if (!Number.isFinite(input.originalBudget)) {
    return { ok: false, error: "Enter a valid budget amount." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("costai_budgets")
    .select("id, wbs_id")
    .eq("id", trimmedBudgetId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingError) {
    console.error("[controlai] updateCostaiBudget lookup", existingError.message);
    return { ok: false, error: "Could not find budget row." };
  }

  if (!existing) {
    return { ok: false, error: "Budget row not found for this project.", notFound: true };
  }

  const notes = input.notes.trim();

  const { data: updated, error: updateError } = await supabase
    .from("costai_budgets")
    .update({
      original_budget: input.originalBudget,
      notes: notes.length > 0 ? notes : null,
    })
    .eq("id", trimmedBudgetId)
    .eq("project_id", projectId)
    .select(BUDGET_SELECT)
    .single();

  if (updateError) {
    console.error("[controlai] updateCostaiBudget update", updateError.message);
    return { ok: false, error: "Could not save budget changes. Please try again." };
  }

  if (!updated) {
    return { ok: false, error: "Could not save budget changes. Please try again." };
  }

  const wbsById = new Map<string, CostBudgetWbsOption>();
  const { data: wbsRow } = await supabase
    .from("costai_wbs")
    .select("id, code, description")
    .eq("id", existing.wbs_id)
    .maybeSingle();

  if (wbsRow) {
    wbsById.set(wbsRow.id, {
      id: wbsRow.id,
      code: wbsRow.code,
      description: wbsRow.description ?? "",
      parentWbsId: null,
      sortOrder: null,
    });
  }

  return { ok: true, row: mapBudgetRow(updated as CostaiBudgetRow, wbsById) };
}

/**
 * Loads WBS and budget rows for the Budget tab after ControlAI project access checks.
 * Uses the service-role client scoped by `project_id` (same gate as workspace project lists).
 */
export async function loadCostModuleBudgetData(projectId: string): Promise<CostModuleBudgetData> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  await requireAccessibleControlAIProject(supabase, user.id, projectId);

  let admin;
  try {
    admin = supabaseAdminClient();
  } catch {
    return { wbsOptions: [], budgetRows: [] };
  }

  const [wbsResult, budgetsResult] = await Promise.all([
    admin
      .from("costai_wbs")
      .select(WBS_SELECT)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("code", { ascending: true }),
    admin
      .from("costai_budgets")
      .select(BUDGET_SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (wbsResult.error || budgetsResult.error) {
    console.error("[controlai] loadCostModuleBudgetData", {
      wbsError: wbsResult.error?.message,
      budgetsError: budgetsResult.error?.message,
    });
    return { wbsOptions: [], budgetRows: [] };
  }

  const wbsOptions = ((wbsResult.data ?? []) as CostaiWbsRow[]).map(rowToWbsOption);
  const wbsById = new Map(wbsOptions.map((option) => [option.id, option]));
  const budgetRows = mapBudgetRows((budgetsResult.data ?? []) as CostaiBudgetRow[], wbsById);

  return { wbsOptions, budgetRows };
}
