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
  projectId: string;
  owners: RiskaiProjectOwnerRow[];
  ownerNames: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Inserts if trimmed name is non-empty and not already present for this project. */
  createProjectOwner: (name: string) => Promise<void>;
};

const RiskProjectOwnersContext = createContext<RiskProjectOwnersContextValue | null>(null);

export function RiskProjectOwnersProvider({
  projectId,
  extraOwnerNamesFromRisks,
  children,
}: {
  projectId: string;
  /** Names present on `riskai_risks.owner` that may be missing from `riskai_project_owners` (e.g. seeded/demo rows). */
  extraOwnerNamesFromRisks?: string[];
  children: ReactNode;
}) {
  const [owners, setOwners] = useState<RiskaiProjectOwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOwners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowserClient();
      const { data, error: qError } = await supabase
        .from("riskai_project_owners")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("is_active", true)
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
  }, [projectId]);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const createProjectOwner = useCallback(
    async (rawName: string) => {
      const name = rawName.trim();
      if (!name) return;
      const supabase = supabaseBrowserClient();
      const { error: insError } = await supabase.from("riskai_project_owners").insert({
        project_id: projectId,
        name,
      });
      if (insError && !/duplicate key|unique constraint/i.test(insError.message)) {
        throw new Error(insError.message);
      }
      dlog("[risk owner] created new owner", name);
      await loadOwners();
    },
    [projectId, loadOwners]
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
      projectId,
      owners: ownersForPicker,
      ownerNames: ownersForPicker.map((o) => o.name),
      loading,
      error,
      refetch: loadOwners,
      createProjectOwner,
    }),
    [projectId, ownersForPicker, loading, error, loadOwners, createProjectOwner]
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
