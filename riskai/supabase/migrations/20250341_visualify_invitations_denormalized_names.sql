-- Denormalized labels for invitation emails (webhook/Edge); filled by RiskAI on insert.

ALTER TABLE public.visualify_invitations
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS inviter_display_name text;
