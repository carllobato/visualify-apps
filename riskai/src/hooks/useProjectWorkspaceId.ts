"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveFetchedProjectWorkspaceId,
  type FetchedProjectWorkspaceId,
} from "@/lib/project/resolveFetchedProjectWorkspaceId";
import { projectIdFromAppPathname } from "@/lib/routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * `visualify_projects.workspace_id` for `/projects/[id]/…`.
 * Does not use `portfolio_id`.
 * Only returns a workspace_id that was fetched for the current URL project —
 * never the previous project's id while a new fetch is in flight.
 */
export function useProjectWorkspaceId(pathname: string | null): string | null {
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const [fetched, setFetched] = useState<FetchedProjectWorkspaceId | null>(null);

  const supabase = useMemo(() => supabaseBrowserClient(), []);

  useEffect(() => {
    if (!projectIdInUrl) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    const requestedId = projectIdInUrl;
    void supabase
      .from("visualify_projects")
      .select("workspace_id")
      .eq("id", requestedId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || typeof data?.workspace_id !== "string" || !data.workspace_id.trim()) {
          setFetched(null);
          return;
        }
        setFetched({ projectId: requestedId, workspaceId: data.workspace_id.trim() });
      });
    return () => {
      cancelled = true;
    };
  }, [projectIdInUrl, supabase]);

  return resolveFetchedProjectWorkspaceId(fetched, projectIdInUrl);
}
