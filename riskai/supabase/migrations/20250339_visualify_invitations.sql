-- Unified invitation records for Visualify apps. RiskAI project invites use resource_type = 'project'.

CREATE TABLE IF NOT EXISTS public.visualify_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type = 'project'),
  resource_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  surname text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visualify_invitations_invite_token_unique UNIQUE (invite_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS visualify_invitations_one_pending_project_email
  ON public.visualify_invitations (resource_type, resource_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS visualify_invitations_resource_lookup
  ON public.visualify_invitations (resource_type, resource_id, status);

CREATE OR REPLACE FUNCTION public.set_visualify_invitations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visualify_invitations_set_updated_at ON public.visualify_invitations;
CREATE TRIGGER visualify_invitations_set_updated_at
  BEFORE UPDATE ON public.visualify_invitations
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_visualify_invitations_updated_at();

ALTER TABLE public.visualify_invitations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.visualify_invitations IS
  'Invitation records; RiskAI writes via service role from API routes after permission checks.';
