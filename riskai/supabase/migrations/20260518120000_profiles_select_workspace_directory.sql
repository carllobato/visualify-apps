-- Workspace-scoped profile directory (read-only SELECT).
-- Lets active co-members of the same visualify_workspace see each other's profile rows
-- for HQ workspace user lists and RiskAI portfolio member lists (inherited workspace rows).
-- Does not grant access to users outside a shared workspace; INSERT/UPDATE unchanged.

-- Matches app loaders: status null, empty, or 'active' (see workspaceMemberAccess / HQ).
CREATE OR REPLACE FUNCTION public.is_active_workspace_member_status(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT
    p_status IS NULL
    OR btrim(p_status) = ''
    OR lower(btrim(p_status)) = 'active';
$$;

REVOKE ALL ON FUNCTION public.is_active_workspace_member_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_workspace_member_status(text) TO authenticated;

-- Read-only directory visibility: viewer (auth.uid) and target profile share a workspace.
DROP POLICY IF EXISTS "profiles_select_workspace_directory" ON public.visualify_profiles;

CREATE POLICY "profiles_select_workspace_directory"
ON public.visualify_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.visualify_workspace_members wm_v
    INNER JOIN public.visualify_workspace_members wm_t
      ON wm_t.workspace_id = wm_v.workspace_id
     AND wm_t.user_id = visualify_profiles.id
    WHERE wm_v.user_id = auth.uid()
      AND public.is_active_workspace_member_status(wm_v.status)
      AND public.is_active_workspace_member_status(wm_t.status)
  )
);
