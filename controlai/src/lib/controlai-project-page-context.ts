import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { requireAccessibleControlAIProject } from "@/lib/controlai-project-access";
import type { AccessibleProject } from "@/lib/portfolios-server";
import { supabaseServerClient } from "@/lib/supabase/server";

export type ControlAIProjectPageContext = {
  project: AccessibleProject;
};

/**
 * Cached per-request project load for `[projectId]` layout and pages.
 * Reuses the same access resolution as the layout gate.
 */
export const loadControlAIProjectPageContext = cache(
  async (projectId: string): Promise<ControlAIProjectPageContext> => {
    const supabase = await supabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      notFound();
    }

    const project = await requireAccessibleControlAIProject(supabase, user.id, projectId);
    return { project };
  },
);
