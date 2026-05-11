-- HQ workspace invitations: extend resource_type and scope roles by resource.

ALTER TABLE public.visualify_invitations
  DROP CONSTRAINT IF EXISTS visualify_invitations_resource_type_check;

ALTER TABLE public.visualify_invitations
  ADD CONSTRAINT visualify_invitations_resource_type_check
  CHECK (resource_type IN ('project', 'portfolio', 'workspace'));

ALTER TABLE public.visualify_invitations
  DROP CONSTRAINT IF EXISTS visualify_invitations_role_check;

ALTER TABLE public.visualify_invitations
  ADD CONSTRAINT visualify_invitations_role_check
  CHECK (
    (resource_type IN ('project', 'portfolio') AND role IN ('owner', 'editor', 'viewer'))
    OR (resource_type = 'workspace' AND role IN ('admin', 'member'))
  );
