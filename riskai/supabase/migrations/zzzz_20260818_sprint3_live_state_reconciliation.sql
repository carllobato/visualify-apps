-- Sprint 3 live-state reconciliation (additive).
--
-- Records schema, RLS, and helpers already applied manually in live Supabase,
-- plus the locked removal of authenticated Project hard-delete.
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.
--
-- Filename uses zzzz_ so this file is last in lexicographic order. Dated 2026*
-- files run BEFORE z_visualify_rls_rpcs_and_riskai_risks_policies.sql, which
-- would otherwise recreate the pre-Sprint-3 Project INSERT/UPDATE/DELETE policies.
--
-- Intentionally omitted: visualify_projects.workspace_id uuid NOT NULL.
-- No active migration creates that column, and application code still treats
-- legacy rows as able to have a null workspace_id (Portfolio fallback). Adding
-- NOT NULL would require guessing Project → Workspace mappings. Do not backfill.

-- =============================================================================
-- 1) visualify_workspaces.reporting_unit
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.visualify_workspaces') IS NULL THEN
    RAISE NOTICE 'visualify_workspaces not present; skipping reporting_unit';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'visualify_workspaces'
      AND column_name = 'reporting_unit'
  ) THEN
    ALTER TABLE public.visualify_workspaces
      ADD COLUMN reporting_unit text NOT NULL DEFAULT 'MILLIONS';
  END IF;

  ALTER TABLE public.visualify_workspaces
    ALTER COLUMN reporting_unit SET DEFAULT 'MILLIONS';

  UPDATE public.visualify_workspaces
  SET reporting_unit = 'MILLIONS'
  WHERE reporting_unit IS NULL;

  ALTER TABLE public.visualify_workspaces
    ALTER COLUMN reporting_unit SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'visualify_workspaces_reporting_unit_check'
  ) THEN
    ALTER TABLE public.visualify_workspaces
      ADD CONSTRAINT visualify_workspaces_reporting_unit_check
      CHECK (reporting_unit IN ('THOUSANDS', 'MILLIONS', 'BILLIONS'));
  END IF;
END $$;

-- =============================================================================
-- 2) visualify_projects.archived_at
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.visualify_projects') IS NULL THEN
    RAISE NOTICE 'visualify_projects not present; skipping archived_at';
    RETURN;
  END IF;

  ALTER TABLE public.visualify_projects
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;
END $$;

-- =============================================================================
-- 3) Read / write helpers (policies below depend on these)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_read_project(
  p_project_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = p_project_id
      AND (
        p.owner_user_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = p_user_id
        )
        OR EXISTS (
          SELECT 1
          FROM public.visualify_workspace_members wm
          WHERE wm.user_id = p_user_id
            AND wm.role IN ('owner', 'admin', 'viewer')
            AND public.is_active_workspace_member_status(wm.status)
            AND (
              wm.workspace_id = p.workspace_id
              OR (
                p.portfolio_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM public.visualify_portfolios pf
                  WHERE pf.id = p.portfolio_id
                    AND pf.workspace_id = wm.workspace_id
                )
              )
            )
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.visualify_portfolios pf
            WHERE pf.id = p.portfolio_id
              AND pf.owner_user_id = p_user_id
          )
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.visualify_portfolio_members pfm
            WHERE pfm.portfolio_id = p.portfolio_id
              AND pfm.user_id = p_user_id
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_project(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_project(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.visualify_can_write_project_content(target_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = target_project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.visualify_workspace_members wm
          WHERE wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
            AND public.is_active_workspace_member_status(wm.status)
            AND (
              wm.workspace_id = p.workspace_id
              OR (
                p.portfolio_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM public.visualify_portfolios pf
                  WHERE pf.id = p.portfolio_id
                    AND pf.workspace_id = wm.workspace_id
                )
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
            AND pm.role IN ('owner', 'editor')
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.visualify_portfolios pf
            WHERE pf.id = p.portfolio_id
              AND pf.owner_user_id = auth.uid()
          )
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.visualify_portfolio_members pfm
            WHERE pfm.portfolio_id = p.portfolio_id
              AND pfm.user_id = auth.uid()
              AND pfm.role IN ('owner', 'editor')
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.visualify_can_write_project_content(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visualify_can_write_project_content(uuid) TO authenticated;

-- Overload 1: auth.uid(); table owner only when 'owner' is requested.
CREATE OR REPLACE FUNCTION public.has_project_member_role(
  p_project_id uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_length(allowed_roles, 1), 0) > 0
    AND (
      EXISTS (
        SELECT 1
        FROM public.visualify_project_members pm
        WHERE pm.project_id = p_project_id
          AND pm.user_id = auth.uid()
          AND pm.role = ANY (allowed_roles)
      )
      OR (
        'owner' = ANY (allowed_roles)
        AND EXISTS (
          SELECT 1
          FROM public.visualify_projects p
          WHERE p.id = p_project_id
            AND p.owner_user_id = auth.uid()
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_project_member_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_project_member_role(uuid, text[]) TO authenticated;

-- Overload 2: explicit user. Table owner matches any non-empty role list.
CREATE OR REPLACE FUNCTION public.has_project_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_length(p_roles, 1), 0) > 0
    AND (
      EXISTS (
        SELECT 1
        FROM public.visualify_projects p
        WHERE p.id = p_project_id
          AND p.owner_user_id = p_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.visualify_project_members pm
        WHERE pm.project_id = p_project_id
          AND pm.user_id = p_user_id
          AND pm.role = ANY (p_roles)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_project_member_role(uuid, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_project_member_role(uuid, uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_project_role(p_project_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_project_member_role(p_project_id, auth.uid(), allowed_roles);
$$;

REVOKE ALL ON FUNCTION public.user_has_project_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_project_role(uuid, text[]) TO authenticated;

-- =============================================================================
-- 4) Project INSERT RLS (both live names; same tight rule)
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert own projects" ON public.visualify_projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.visualify_projects;

CREATE POLICY "Users can insert own projects"
ON public.visualify_projects
FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
);

CREATE POLICY "projects_insert_own"
ON public.visualify_projects
FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
);

-- =============================================================================
-- 5) Project UPDATE RLS (both live names; editor does not qualify)
-- =============================================================================

DROP POLICY IF EXISTS "Owners and editors can update accessible projects" ON public.visualify_projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.visualify_projects;

CREATE POLICY "Owners and editors can update accessible projects"
ON public.visualify_projects
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = visualify_projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = visualify_projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
  )
);

CREATE POLICY "projects_update_own"
ON public.visualify_projects
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = visualify_projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
  )
)
WITH CHECK (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm
    WHERE wm.workspace_id = visualify_projects.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
      AND public.is_active_workspace_member_status(wm.status)
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = visualify_projects.id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
  )
);

-- =============================================================================
-- 6) Project SELECT RLS
-- =============================================================================

DROP POLICY IF EXISTS "projects_select_own" ON public.visualify_projects;
DROP POLICY IF EXISTS "projects_select_own_or_portfolio" ON public.visualify_projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.visualify_projects;
DROP POLICY IF EXISTS "projects_select_strict" ON public.visualify_projects;

CREATE POLICY "Users can view accessible projects"
ON public.visualify_projects
FOR SELECT
TO authenticated
USING (public.can_read_project(id, auth.uid()));

CREATE POLICY "projects_select_strict"
ON public.visualify_projects
FOR SELECT
TO public
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = visualify_projects.id
      AND pm.user_id = auth.uid()
  )
);

-- =============================================================================
-- 7) Project DELETE: no authenticated hard-delete policy
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.visualify_projects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "projects_delete_own" ON public.visualify_projects';
  END IF;
  IF to_regclass('public.projects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "projects_delete_own" ON public.projects';
  END IF;
END $$;

-- =============================================================================
-- 8) RiskAI risks / snapshots: call confirmed live helpers
-- Historical Git policies inlined owner/editor/any-portfolio-member and did not
-- invoke can_read_project / visualify_can_write_project_content. Recreate known
-- names so a migration-built database uses those helpers. Direct owner/editor
-- write remains inside visualify_can_write_project_content (not broadened).
-- =============================================================================

DROP POLICY IF EXISTS "risks_select_own_project" ON public.riskai_risks;
CREATE POLICY "risks_select_own_project"
ON public.riskai_risks
FOR SELECT
USING (public.can_read_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "risks_insert_own_project" ON public.riskai_risks;
CREATE POLICY "risks_insert_own_project"
ON public.riskai_risks
FOR INSERT
WITH CHECK (public.visualify_can_write_project_content(project_id));

DROP POLICY IF EXISTS "risks_update_own_project" ON public.riskai_risks;
CREATE POLICY "risks_update_own_project"
ON public.riskai_risks
FOR UPDATE
USING (public.visualify_can_write_project_content(project_id))
WITH CHECK (public.visualify_can_write_project_content(project_id));

DROP POLICY IF EXISTS "risks_delete_own_project" ON public.riskai_risks;
CREATE POLICY "risks_delete_own_project"
ON public.riskai_risks
FOR DELETE
USING (public.visualify_can_write_project_content(project_id));

DROP POLICY IF EXISTS "simulation_snapshots_select_own_project" ON public.riskai_simulation_snapshots;
CREATE POLICY "simulation_snapshots_select_own_project"
ON public.riskai_simulation_snapshots
FOR SELECT
USING (public.can_read_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "simulation_snapshots_insert_own_project" ON public.riskai_simulation_snapshots;
CREATE POLICY "simulation_snapshots_insert_own_project"
ON public.riskai_simulation_snapshots
FOR INSERT
WITH CHECK (public.visualify_can_write_project_content(project_id));

DROP POLICY IF EXISTS "simulation_snapshots_update_own_project" ON public.riskai_simulation_snapshots;
CREATE POLICY "simulation_snapshots_update_own_project"
ON public.riskai_simulation_snapshots
FOR UPDATE
USING (public.visualify_can_write_project_content(project_id))
WITH CHECK (public.visualify_can_write_project_content(project_id));

DROP POLICY IF EXISTS "simulation_snapshots_delete_own_project" ON public.riskai_simulation_snapshots;
CREATE POLICY "simulation_snapshots_delete_own_project"
ON public.riskai_simulation_snapshots
FOR DELETE
USING (public.visualify_can_write_project_content(project_id));

-- =============================================================================
-- 9) Project member RLS (live Sprint 3: workspace owner/admin mutation)
-- =============================================================================

DROP POLICY IF EXISTS "project_members_select_project_access" ON public.visualify_project_members;
DROP POLICY IF EXISTS "Users can view project members" ON public.visualify_project_members;

CREATE POLICY "Users can view project members"
ON public.visualify_project_members
FOR SELECT
USING (public.can_read_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners and editors can add members" ON public.visualify_project_members;
DROP POLICY IF EXISTS "project_members_insert_project_owner" ON public.visualify_project_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add project members" ON public.visualify_project_members;

CREATE POLICY "Workspace owners and admins can add project members"
ON public.visualify_project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = visualify_project_members.project_id
      AND EXISTS (
        SELECT 1
        FROM public.visualify_workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
          AND public.is_active_workspace_member_status(wm.status)
      )
  )
);

DROP POLICY IF EXISTS "Project owners can update members" ON public.visualify_project_members;
DROP POLICY IF EXISTS "project_members_update_project_owner" ON public.visualify_project_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update project members" ON public.visualify_project_members;

CREATE POLICY "Workspace owners and admins can update project members"
ON public.visualify_project_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = visualify_project_members.project_id
      AND EXISTS (
        SELECT 1
        FROM public.visualify_workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
          AND public.is_active_workspace_member_status(wm.status)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = visualify_project_members.project_id
      AND EXISTS (
        SELECT 1
        FROM public.visualify_workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
          AND public.is_active_workspace_member_status(wm.status)
      )
  )
);

DROP POLICY IF EXISTS "Project owners can remove members" ON public.visualify_project_members;
DROP POLICY IF EXISTS "project_members_delete_project_owner" ON public.visualify_project_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove project members" ON public.visualify_project_members;

CREATE POLICY "Workspace owners and admins can remove project members"
ON public.visualify_project_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = visualify_project_members.project_id
      AND EXISTS (
        SELECT 1
        FROM public.visualify_workspace_members wm
        WHERE wm.workspace_id = p.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
          AND public.is_active_workspace_member_status(wm.status)
      )
  )
);
