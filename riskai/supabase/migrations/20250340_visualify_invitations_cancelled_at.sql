ALTER TABLE public.visualify_invitations
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
