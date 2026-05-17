"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { portfolioIdFromAppPathname, projectIdFromAppPathname } from "@/lib/routes";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Portfolio id for shell nav: from `/riskai/portfolios/[id]/…`, or loaded from the
 * current `/riskai/projects/[id]/…` route (same behaviour as legacy `Sidebar`).
 */
export function useResolvedPortfolioId(pathname: string | null): string | null {
  const portfolioIdInUrl = portfolioIdFromAppPathname(pathname);
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const [portfolioIdForProject, setPortfolioIdForProject] = useState<string | null>(null);
  const projectIdInUrlRef = useRef(projectIdInUrl);

  useEffect(() => {
    projectIdInUrlRef.current = projectIdInUrl;
  }, [projectIdInUrl]);

  const supabase = useMemo(() => supabaseBrowserClient(), []);

  useEffect(() => {
    if (!projectIdInUrl) {
      setPortfolioIdForProject(null);
      return;
    }
    let cancelled = false;
    const requestedId = projectIdInUrl;
    void supabase
      .from("visualify_projects")
      .select("portfolio_id")
      .eq("id", requestedId)
      .single()
      .then(({ data, error }) => {
        if (cancelled || projectIdInUrlRef.current !== requestedId) return;
        if (error || !data?.portfolio_id) {
          setPortfolioIdForProject(null);
          return;
        }
        setPortfolioIdForProject(data.portfolio_id);
      });
    return () => {
      cancelled = true;
    };
  }, [projectIdInUrl, supabase]);

  return portfolioIdInUrl ?? portfolioIdForProject;
}
