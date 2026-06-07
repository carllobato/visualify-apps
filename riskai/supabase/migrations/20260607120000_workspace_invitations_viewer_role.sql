-- Allow viewer on workspace invitations (aligned with visualify_workspace_members.role).

ALTER TABLE public.visualify_invitations
  DROP CONSTRAINT IF EXISTS visualify_invitations_role_check;

ALTER TABLE public.visualify_invitations
  ADD CONSTRAINT visualify_invitations_role_check
  CHECK (
    (resource_type IN ('project', 'portfolio') AND role IN ('owner', 'editor', 'viewer'))
    OR (resource_type = 'workspace' AND role IN ('owner', 'admin', 'member', 'viewer'))
  );
