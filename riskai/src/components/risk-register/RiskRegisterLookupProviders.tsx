"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { workspaceIdFromVisualifyProjectRow } from "@/lib/risk-register/workspaceScopedLookups";
import { RiskAppliesToOptionsProvider } from "./RiskAppliesToOptionsContext";
import { RiskCategoryOptionsProvider } from "./RiskCategoryOptionsContext";
import { RiskProjectOwnersProvider } from "./RiskProjectOwnersContext";
import { RiskStatusOptionsProvider } from "./RiskStatusOptionsContext";

/**
 * Resolves `visualify_projects.workspace_id` for the open project so Owner/Category
 * lookups can be scoped to the workspace (shared across projects in that workspace).
 */
function useWorkspaceIdForProject(projectId: string): string | null {
  const trimmedProjectId = projectId.trim();
  const [fetched, setFetched] = useState<{
    projectId: string;
    workspaceId: string;
  } | null>(null);
  const supabase = useMemo(() => supabaseBrowserClient(), []);

  useEffect(() => {
    if (!trimmedProjectId) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    const requestedId = trimmedProjectId;
    void supabase
      .from("visualify_projects")
      .select("workspace_id")
      .eq("id", requestedId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        const workspaceId = workspaceIdFromVisualifyProjectRow(data);
        if (error || !workspaceId) {
          setFetched(null);
          return;
        }
        setFetched({ projectId: requestedId, workspaceId });
      });
    return () => {
      cancelled = true;
    };
  }, [trimmedProjectId, supabase]);

  if (!fetched || fetched.projectId !== trimmedProjectId) return null;
  return fetched.workspaceId;
}

/** Wraps risk-register screens so category / status / applies_to / project owners lookups are available. */
export function RiskRegisterLookupProviders({
  projectId,
  extraOwnerNamesFromRisks,
  ownersReadOnly = false,
  children,
}: {
  projectId: string;
  /** Owner strings from loaded risks so the picker lists names present on rows even if missing from `riskai_project_owners`. */
  extraOwnerNamesFromRisks?: string[];
  /** When true, block creating new owner/category lookup rows (viewer / read-only). */
  ownersReadOnly?: boolean;
  children: ReactNode;
}) {
  const workspaceId = useWorkspaceIdForProject(projectId);

  return (
    <RiskCategoryOptionsProvider
      workspaceId={workspaceId}
      categoriesReadOnly={ownersReadOnly}
    >
      <RiskStatusOptionsProvider>
        <RiskAppliesToOptionsProvider>
          <RiskProjectOwnersProvider
            workspaceId={workspaceId}
            extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
            ownersReadOnly={ownersReadOnly}
          >
            {children}
          </RiskProjectOwnersProvider>
        </RiskAppliesToOptionsProvider>
      </RiskStatusOptionsProvider>
    </RiskCategoryOptionsProvider>
  );
}
