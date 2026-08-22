-- Sprint 5 — closure and review persistence (additive, reversible).
--
-- Adds closure audit columns and optional created_by; backfills missing
-- last_reviewed_at from updated_at / created_at. Does not invent closure
-- metadata for existing Closed risks.
-- Create only; do not apply to live Supabase from this change set.
--
-- Target: public.riskai_risks only. Fails hard if that table is absent.
--
-- Rollback (manual):
--   ALTER TABLE public.riskai_risks
--     DROP COLUMN IF EXISTS closure_note,
--     DROP COLUMN IF EXISTS closed_at,
--     DROP COLUMN IF EXISTS closed_by,
--     DROP COLUMN IF EXISTS created_by;
--   (last_reviewed_* backfill is non-destructive; leave values as-is)

DO $$
BEGIN
  IF to_regclass('public.riskai_risks') IS NULL THEN
    RAISE EXCEPTION
      'public.riskai_risks does not exist; refusing to apply closure/review migration';
  END IF;

  -- -------------------------------------------------------------------------
  -- 1) Closure + creator audit columns (nullable; FK matches last_reviewed_by)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.riskai_risks
    ADD COLUMN IF NOT EXISTS closure_note text,
    ADD COLUMN IF NOT EXISTS closed_at timestamptz,
    ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

  -- -------------------------------------------------------------------------
  -- 2) Backfill missing last_reviewed_at only (leave last_reviewed_by null)
  -- -------------------------------------------------------------------------
  UPDATE public.riskai_risks
  SET last_reviewed_at = COALESCE(updated_at, created_at)
  WHERE last_reviewed_at IS NULL
    AND COALESCE(updated_at, created_at) IS NOT NULL;

  UPDATE public.riskai_risks
  SET last_review_month = date_trunc('month', last_reviewed_at)::date
  WHERE last_reviewed_at IS NOT NULL
    AND last_review_month IS NULL;
END $$;
