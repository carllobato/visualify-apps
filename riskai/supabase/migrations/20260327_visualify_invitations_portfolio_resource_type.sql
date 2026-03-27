-- Allow Visualify invitation records for portfolios as well as projects.
-- This keeps outbound email on the unified `visualify_invitations` webhook path.

ALTER TABLE public.visualify_invitations
  DROP CONSTRAINT IF EXISTS visualify_invitations_resource_id_fkey;

ALTER TABLE public.visualify_invitations
  DROP CONSTRAINT IF EXISTS visualify_invitations_resource_type_check;

ALTER TABLE public.visualify_invitations
  ADD CONSTRAINT visualify_invitations_resource_type_check
  CHECK (resource_type IN ('project', 'portfolio'));
