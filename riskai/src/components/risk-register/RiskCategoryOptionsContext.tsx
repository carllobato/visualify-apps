"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { dlog } from "@/lib/debug";
import {
  findLookupNameCaseInsensitive,
  resolveCreateLookupName,
  shouldIgnoreLookupUniqueViolation,
  workspaceScopedCategoryInsert,
  workspaceScopedCategoryListEq,
} from "@/lib/risk-register/workspaceScopedLookups";

export type RiskaiRiskCategoryRow = { id: string; name: string };

type RiskCategoryOptionsContextValue = {
  workspaceId: string | null;
  categories: RiskaiRiskCategoryRow[];
  loading: boolean;
  error: string | null;
  categoryNames: string[];
  categoriesReadOnly: boolean;
  refetch: () => Promise<void>;
  /**
   * Inserts a workspace-scoped category when needed.
   * Returns the canonical name to select (existing casing on reuse), or null when blank/no-op.
   * Throws on genuine insert/permission errors.
   */
  createRiskCategory: (name: string) => Promise<string | null>;
};

const RiskCategoryOptionsContext = createContext<RiskCategoryOptionsContextValue | null>(null);

export function RiskCategoryOptionsProvider({
  workspaceId,
  categoriesReadOnly = false,
  children,
}: {
  /** `visualify_projects.workspace_id` for the current project. */
  workspaceId: string | null;
  /** When true, block creating new `riskai_risk_categories` rows (viewer / read-only). */
  categoriesReadOnly?: boolean;
  children: ReactNode;
}) {
  const [categories, setCategories] = useState<RiskaiRiskCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async (): Promise<RiskaiRiskCategoryRow[]> => {
    const scopedWorkspaceId = workspaceId?.trim() || null;
    if (!scopedWorkspaceId) {
      setCategories([]);
      setError(null);
      setLoading(false);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowserClient();
      const listEq = workspaceScopedCategoryListEq(scopedWorkspaceId);
      const { data, error: qError } = await supabase
        .from("riskai_risk_categories")
        .select("id, name")
        .eq("workspace_id", listEq.workspace_id)
        .eq("is_active", listEq.is_active)
        .order("name", { ascending: true });
      if (qError) {
        setError(qError.message);
        setCategories([]);
        return [];
      }
      const rows = (data ?? []) as RiskaiRiskCategoryRow[];
      dlog("[risk categories] fetched", rows);
      setCategories(rows);
      return rows;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
      setCategories([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const createRiskCategory = useCallback(
    async (rawName: string): Promise<string | null> => {
      if (categoriesReadOnly) return null;
      const scopedWorkspaceId = workspaceId?.trim() || null;
      if (!scopedWorkspaceId) return null;

      const decision = resolveCreateLookupName(
        categories.map((c) => c.name),
        rawName
      );
      if (decision.action === "reject_blank") return null;
      if (decision.action === "reuse") {
        dlog("[risk category] reuse existing", decision.name);
        return decision.name;
      }

      const name = decision.name;
      const supabase = supabaseBrowserClient();
      const { error: insError } = await supabase
        .from("riskai_risk_categories")
        .insert(workspaceScopedCategoryInsert(scopedWorkspaceId, name));
      if (insError && !shouldIgnoreLookupUniqueViolation(insError)) {
        throw new Error(insError.message);
      }
      dlog("[risk category] created new category", name);
      const rows = await loadCategories();
      return findLookupNameCaseInsensitive(
        rows.map((c) => c.name),
        name
      ) ?? name;
    },
    [categoriesReadOnly, workspaceId, categories, loadCategories]
  );

  const value = useMemo<RiskCategoryOptionsContextValue>(
    () => ({
      workspaceId: workspaceId?.trim() || null,
      categories,
      loading,
      error,
      categoryNames: categories.map((c) => c.name),
      categoriesReadOnly,
      refetch: async () => {
        await loadCategories();
      },
      createRiskCategory,
    }),
    [workspaceId, categories, loading, error, categoriesReadOnly, loadCategories, createRiskCategory]
  );

  return (
    <RiskCategoryOptionsContext.Provider value={value}>{children}</RiskCategoryOptionsContext.Provider>
  );
}

export function useRiskCategoryOptions(): RiskCategoryOptionsContextValue {
  const ctx = useContext(RiskCategoryOptionsContext);
  if (!ctx) {
    throw new Error("useRiskCategoryOptions must be used within RiskCategoryOptionsProvider");
  }
  return ctx;
}
