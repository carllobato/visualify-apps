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
  shouldIgnoreLookupUniqueViolation,
  workspaceScopedOwnerInsert,
  workspaceScopedOwnerListEq,
} from "@/lib/risk-register/workspaceScopedLookups";

export type RiskaiProjectOwnerRow = { id: string; name: string };

/** Stable synthetic ids for owner names that appear on risks but not (yet) in `riskai_project_owners`. */
const SYNTHETIC_OWNER_ID_PREFIX = "synth:";

function syntheticProjectOwnerId(name: string): string {
  return `${SYNTHETIC_OWNER_ID_PREFIX}${encodeURIComponent(name)}`;
}

/** Distinct non-empty owner strings from risks (excludes "Unassigned"), for merging into the owner picker. */
export function distinctOwnerNamesFromRisks(
  risks: { owner?: string | null }[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of risks) {
    const raw = r.owner?.trim() ?? "";
    if (!raw || raw === "Unassigned") continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

type RiskProjectOwnersContextValue = {
  workspaceId: string | null;
  owners: RiskaiProjectOwnerRow[];
  ownerNames: string[];
  loading: boolean;
  error: string | null;
  ownersReadOnly: boolean;
  refetch: () => Promise<void>;
  /** Inserts if trimmed name is non-empty; scoped to the project workspace (shared across its projects). */
  createProjectOwner: (name: string) => Promise<void>;
};

const RiskProjectOwnersContext = createContext<RiskProjectOwnersContextValue | null>(null);

export function RiskProjectOwnersProvider({
  workspaceId,
  extraOwnerNamesFromRisks,
  ownersReadOnly = false,
  children,
}: {
  /** `visualify_projects.workspace_id` for the current project. */
  workspaceId: string | null;
  /** Names present on `riskai_risks.owner` that may be missing from `riskai_project_owners` (e.g. seeded/demo rows). */
  extraOwnerNamesFromRisks?: string[];
  ownersReadOnly?: boolean;
  children: ReactNode;
}) {
  const [owners, setOwners] = useState<RiskaiProjectOwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOwners = useCallback(async () => {
    const scopedWorkspaceId = workspaceId?.trim() || null;
    if (!scopedWorkspaceId) {
      setOwners([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowserClient();
      const listEq = workspaceScopedOwnerListEq(scopedWorkspaceId);
      const { data, error: qError } = await supabase
        .from("riskai_project_owners")
        .select("id, name")
        .eq("workspace_id", listEq.workspace_id)
        .eq("is_active", listEq.is_active)
        .order("name", { ascending: true });
      if (qError) {
        setError(qError.message);
        setOwners([]);
        return;
      }
      const rows = (data ?? []) as RiskaiProjectOwnerRow[];
      dlog("[risk owners] fetched", rows);
      setOwners(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load owners");
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const createProjectOwner = useCallback(
    async (rawName: string) => {
      if (ownersReadOnly) return;
      const scopedWorkspaceId = workspaceId?.trim() || null;
      if (!scopedWorkspaceId) return;
      const name = rawName.trim();
      if (!name) return;
      const supabase = supabaseBrowserClient();
      const { error: insError } = await supabase
        .from("riskai_project_owners")
        .insert(workspaceScopedOwnerInsert(scopedWorkspaceId, name));
      if (insError && !shouldIgnoreLookupUniqueViolation(insError)) {
        throw new Error(insError.message);
      }
      dlog("[risk owner] created new owner", name);
      await loadOwners();
    },
    [ownersReadOnly, workspaceId, loadOwners]
  );

  const ownersForPicker = useMemo(() => {
    const fromDb = owners;
    const dbNames = new Set(fromDb.map((o) => o.name));
    const synthetic: RiskaiProjectOwnerRow[] = [];
    for (const name of extraOwnerNamesFromRisks ?? []) {
      const n = name.trim();
      if (!n || dbNames.has(n)) continue;
      dbNames.add(n);
      synthetic.push({ id: syntheticProjectOwnerId(n), name: n });
    }
    if (synthetic.length === 0) return fromDb;
    return [...fromDb, ...synthetic].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [owners, extraOwnerNamesFromRisks]);

  const value = useMemo<RiskProjectOwnersContextValue>(
    () => ({
      workspaceId: workspaceId?.trim() || null,
      owners: ownersForPicker,
      ownerNames: ownersForPicker.map((o) => o.name),
      loading,
      error,
      ownersReadOnly,
      refetch: loadOwners,
      createProjectOwner,
    }),
    [workspaceId, ownersForPicker, loading, error, ownersReadOnly, loadOwners, createProjectOwner]
  );

  return (
    <RiskProjectOwnersContext.Provider value={value}>{children}</RiskProjectOwnersContext.Provider>
  );
}

export function useRiskProjectOwners(): RiskProjectOwnersContextValue {
  const ctx = useContext(RiskProjectOwnersContext);
  if (!ctx) {
    throw new Error("useRiskProjectOwners must be used within RiskProjectOwnersProvider");
  }
  return ctx;
}
