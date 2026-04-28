ALTER TABLE public.riskai_risks
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_review_month date,
  ADD COLUMN IF NOT EXISTS last_reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.riskai_mark_risk_reviewed(
  p_project_id uuid,
  p_risk_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.riskai_risks
  SET
    last_reviewed_at = now(),
    last_review_month = date_trunc('month', now())::date,
    last_reviewed_by = auth.uid()
  WHERE project_id = p_project_id
    AND id = p_risk_id;
$$;

REVOKE ALL ON FUNCTION public.riskai_mark_risk_reviewed(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.riskai_mark_risk_reviewed(uuid, uuid) TO authenticated;
