-- Fix legacy table references in SECURITY DEFINER helpers/RPCs and RLS on visualify_* physical tables.

CREATE OR REPLACE FUNCTION public.has_portfolio_member_role(
  p_portfolio_id uuid,
  p_user_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_length(p_roles, 1), 0) > 0
    AND (
      EXISTS (
        SELECT 1
        FROM public.visualify_portfolios pf
        WHERE pf.id = p_portfolio_id AND pf.owner_user_id = p_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.visualify_portfolio_members pm
        WHERE pm.portfolio_id = p_portfolio_id
          AND pm.user_id = p_user_id
          AND pm.role = ANY (p_roles)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_portfolio_member_role(uuid, uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_portfolio_member_role(uuid, uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_portfolio_member(p_portfolio_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visualify_portfolios pf
    WHERE pf.id = p_portfolio_id AND pf.owner_user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_portfolio_members pm
    WHERE pm.portfolio_id = p_portfolio_id AND pm.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_portfolio_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portfolio_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visualify_projects p
    WHERE p.id = p_project_id AND p.owner_user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.visualify_project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_project_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_length(p_roles, 1), 0) > 0
    AND (
      EXISTS (
        SELECT 1
        FROM public.visualify_projects p
        WHERE p.id = p_project_id AND p.owner_user_id = p_user_id
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
SET search_path = public
AS $$
  SELECT public.has_project_member_role(p_project_id, auth.uid(), allowed_roles);
$$;

REVOKE ALL ON FUNCTION public.user_has_project_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_project_role(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.riskai_portfolio_member_auth_emails(
  p_portfolio_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au
  INNER JOIN public.visualify_portfolio_members pm ON pm.user_id = au.id AND pm.portfolio_id = p_portfolio_id
  WHERE au.id = ANY (p_user_ids)
    AND au.email IS NOT NULL
    AND btrim(au.email) <> ''
    AND (
      EXISTS (
        SELECT 1 FROM public.visualify_portfolios p
        WHERE p.id = p_portfolio_id AND p.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.visualify_portfolio_members pm2
        WHERE pm2.portfolio_id = p_portfolio_id AND pm2.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.riskai_portfolio_member_auth_emails(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.riskai_portfolio_member_auth_emails(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.riskai_project_member_auth_emails(
  p_project_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au
  INNER JOIN public.visualify_project_members pjm ON pjm.user_id = au.id AND pjm.project_id = p_project_id
  WHERE au.id = ANY (p_user_ids)
    AND au.email IS NOT NULL
    AND btrim(au.email) <> ''
    AND (
      EXISTS (
        SELECT 1 FROM public.visualify_projects p
        WHERE p.id = p_project_id AND p.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.visualify_project_members pm
        WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.riskai_project_member_auth_emails(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.riskai_project_member_auth_emails(uuid, uuid[]) TO authenticated;

DROP FUNCTION IF EXISTS public.riskai_find_profile_by_email_for_portfolio(text, uuid);

CREATE OR REPLACE FUNCTION public.riskai_find_profile_by_email_for_portfolio(p_email text, p_portfolio_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  surname text,
  company text,
  already_member boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    au.id,
    COALESCE(pr.email, au.email)::text AS email,
    pr.first_name,
    pr.surname,
    pr.company,
    EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = p_portfolio_id AND pm.user_id = au.id
    ) AS already_member
  FROM auth.users au
  LEFT JOIN public.visualify_profiles pr ON pr.id = au.id
  WHERE au.email IS NOT NULL
    AND lower(trim(au.email)) = lower(trim(p_email))
    AND (
      EXISTS (
        SELECT 1 FROM public.visualify_portfolios p
        WHERE p.id = p_portfolio_id AND p.owner_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.visualify_portfolio_members pm
        WHERE pm.portfolio_id = p_portfolio_id
          AND pm.user_id = auth.uid()
          AND pm.role IN ('owner', 'editor', 'admin')
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.riskai_find_profile_by_email_for_portfolio(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.riskai_find_profile_by_email_for_portfolio(text, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.riskai_find_profile_by_email_for_project(text, uuid);

CREATE OR REPLACE FUNCTION public.riskai_find_profile_by_email_for_project(p_email text, p_project_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  surname text,
  company text,
  already_member boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    au.id,
    COALESCE(pr.email, au.email)::text AS email,
    pr.first_name,
    pr.surname,
    pr.company,
    EXISTS (
      SELECT 1 FROM public.visualify_project_members pm
      WHERE pm.project_id = p_project_id AND pm.user_id = au.id
    ) AS already_member
  FROM auth.users au
  LEFT JOIN public.visualify_profiles pr ON pr.id = au.id
  WHERE au.email IS NOT NULL
    AND lower(trim(au.email)) = lower(trim(p_email))
    AND EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE p.id = p_project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm2
          WHERE pm2.project_id = p.id AND pm2.user_id = auth.uid() AND pm2.role IN ('owner', 'editor')
        )
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.riskai_find_profile_by_email_for_project(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.riskai_find_profile_by_email_for_project(text, uuid) TO authenticated;

ALTER TABLE public.visualify_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.visualify_profiles;
CREATE POLICY "profiles_select_own" ON public.visualify_profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.visualify_profiles;
CREATE POLICY "profiles_insert_own" ON public.visualify_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.visualify_profiles;
CREATE POLICY "profiles_update_own" ON public.visualify_profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_select_project_directory" ON public.visualify_profiles;
CREATE POLICY "profiles_select_project_directory" ON public.visualify_profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE (
        p.owner_user_id = visualify_profiles.id
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members tpm
          WHERE tpm.project_id = p.id AND tpm.user_id = visualify_profiles.id
        )
      )
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM public.visualify_portfolios p2 WHERE p2.id = p.portfolio_id AND p2.owner_user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.visualify_portfolio_members pfm WHERE pfm.portfolio_id = p.portfolio_id AND pfm.user_id = auth.uid())
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "profiles_select_portfolio_directory" ON public.visualify_profiles;
CREATE POLICY "profiles_select_portfolio_directory" ON public.visualify_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.visualify_portfolio_members pm_v
      INNER JOIN public.visualify_portfolio_members pm_t
        ON pm_t.portfolio_id = pm_v.portfolio_id
       AND pm_t.user_id = visualify_profiles.id
      WHERE pm_v.user_id = auth.uid()
    )
  );

ALTER TABLE public.visualify_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualify_portfolio_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolios_select_own_or_member" ON public.visualify_portfolios;
CREATE POLICY "portfolios_select_own_or_member" ON public.visualify_portfolios
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolios.id AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "portfolios_insert_own" ON public.visualify_portfolios;
CREATE POLICY "portfolios_insert_own" ON public.visualify_portfolios
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "portfolios_delete_own" ON public.visualify_portfolios;
CREATE POLICY "portfolios_delete_own" ON public.visualify_portfolios
  FOR DELETE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "portfolios_update_own" ON public.visualify_portfolios;
CREATE POLICY "portfolios_update_own" ON public.visualify_portfolios
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolios.id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "portfolio_members_select" ON public.visualify_portfolio_members;
CREATE POLICY "portfolio_members_select" ON public.visualify_portfolio_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolios p
      WHERE p.id = visualify_portfolio_members.portfolio_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm2
      WHERE pm2.portfolio_id = visualify_portfolio_members.portfolio_id
        AND pm2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "portfolio_members_insert_owner" ON public.visualify_portfolio_members;
CREATE POLICY "portfolio_members_insert_owner" ON public.visualify_portfolio_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visualify_portfolios p
      WHERE p.id = visualify_portfolio_members.portfolio_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolio_members.portfolio_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'editor', 'admin')
    )
  );

DROP POLICY IF EXISTS "portfolio_members_delete_owner" ON public.visualify_portfolio_members;
CREATE POLICY "portfolio_members_delete_owner" ON public.visualify_portfolio_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.visualify_portfolios p
      WHERE p.id = visualify_portfolio_members.portfolio_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolio_members.portfolio_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "portfolio_members_update_owner" ON public.visualify_portfolio_members;
CREATE POLICY "portfolio_members_update_owner" ON public.visualify_portfolio_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.visualify_portfolios p
      WHERE p.id = visualify_portfolio_members.portfolio_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolio_members.portfolio_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visualify_portfolios p
      WHERE p.id = visualify_portfolio_members.portfolio_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.visualify_portfolio_members pm
      WHERE pm.portfolio_id = visualify_portfolio_members.portfolio_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.visualify_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualify_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select_project_access" ON public.visualify_project_members;
CREATE POLICY "project_members_select_project_access" ON public.visualify_project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE p.id = visualify_project_members.project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
        OR (
          p.portfolio_id IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM public.visualify_portfolios p2 WHERE p2.id = p.portfolio_id AND p2.owner_user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM public.visualify_portfolio_members pfm WHERE pfm.portfolio_id = p.portfolio_id AND pfm.user_id = auth.uid())
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "project_members_insert_project_owner" ON public.visualify_project_members;
CREATE POLICY "project_members_insert_project_owner" ON public.visualify_project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE p.id = visualify_project_members.project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "project_members_update_project_owner" ON public.visualify_project_members;
CREATE POLICY "project_members_update_project_owner" ON public.visualify_project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE p.id = visualify_project_members.project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'owner'
        )
      )
    )
  );

DROP POLICY IF EXISTS "project_members_delete_project_owner" ON public.visualify_project_members;
CREATE POLICY "project_members_delete_project_owner" ON public.visualify_project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.visualify_projects p
      WHERE p.id = visualify_project_members.project_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.visualify_project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'owner'
        )
      )
    )
  );

DROP POLICY IF EXISTS "projects_select_own_or_portfolio" ON public.visualify_projects;
CREATE POLICY "projects_select_own_or_portfolio" ON public.visualify_projects
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_project_members pm
      WHERE pm.project_id = visualify_projects.id AND pm.user_id = auth.uid()
    )
    OR (
      portfolio_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.visualify_portfolios p WHERE p.id = visualify_projects.portfolio_id AND p.owner_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.visualify_portfolio_members pm WHERE pm.portfolio_id = visualify_projects.portfolio_id AND pm.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "projects_update_own" ON public.visualify_projects;
CREATE POLICY "projects_update_own" ON public.visualify_projects
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.visualify_project_members pm
      WHERE pm.project_id = visualify_projects.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "projects_insert_own" ON public.visualify_projects;
CREATE POLICY "projects_insert_own" ON public.visualify_projects
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "projects_delete_own" ON public.visualify_projects;
CREATE POLICY "projects_delete_own" ON public.visualify_projects
  FOR DELETE USING (owner_user_id = auth.uid());
