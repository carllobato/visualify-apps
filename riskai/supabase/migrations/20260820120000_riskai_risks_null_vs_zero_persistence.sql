-- Sprint 5 — null vs zero persistence (additive, reversible).
--
-- Blank/null = unassessed. Explicit 0 = assessed as zero.
-- Create only; do not apply to live Supabase from this change set.
--
-- Target: public.riskai_risks only. Fails hard if that table is absent.
--
-- Expected backfill counts from the audited 99-row live dataset:
--   mitigation_cost 0 → null (blank description): 47
--   mitigation_cost 0 preserved (non-empty description): 7
--   pre_probability_pct backfilled from legacy 1–5: 86
--   post_probability_pct: no backfill
--   cost/time exposure zeros: left unchanged

DO $$
BEGIN
  IF to_regclass('public.riskai_risks') IS NULL THEN
    RAISE EXCEPTION
      'public.riskai_risks does not exist; refusing to apply null-vs-zero migration';
  END IF;

  -- -------------------------------------------------------------------------
  -- 1) Make draft-critical numerics nullable; drop DEFAULT 0 coercion
  -- -------------------------------------------------------------------------
  ALTER TABLE public.riskai_risks ALTER COLUMN mitigation_cost DROP DEFAULT;
  ALTER TABLE public.riskai_risks ALTER COLUMN mitigation_cost DROP NOT NULL;

  ALTER TABLE public.riskai_risks ALTER COLUMN pre_cost_ml DROP DEFAULT;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_cost_ml DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_time_ml DROP DEFAULT;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_time_ml DROP NOT NULL;

  ALTER TABLE public.riskai_risks ALTER COLUMN post_cost_ml DROP DEFAULT;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_cost_ml DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_time_ml DROP DEFAULT;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_time_ml DROP NOT NULL;

  -- Legacy 1–5 scores: nullable so incomplete Drafts can persist without placeholders
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_probability DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_probability DROP NOT NULL;

  -- Optional post-mitigation min/max (already nullable on modern schemas; force-safe)
  ALTER TABLE public.riskai_risks ALTER COLUMN post_cost_min DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_cost_max DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_time_min DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_time_max DROP NOT NULL;

  -- Pre min/max already nullable via 20250311; keep incomplete Drafts writable
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_cost_min DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_cost_max DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_time_min DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_time_max DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN pre_probability_pct DROP NOT NULL;
  ALTER TABLE public.riskai_risks ALTER COLUMN post_probability_pct DROP NOT NULL;

  -- -------------------------------------------------------------------------
  -- 2) Safe mitigation_cost backfill (only default zeros without description)
  -- -------------------------------------------------------------------------
  UPDATE public.riskai_risks
  SET mitigation_cost = NULL
  WHERE mitigation_cost = 0
    AND (mitigation_description IS NULL OR btrim(mitigation_description) = '');

  -- -------------------------------------------------------------------------
  -- 3) Backfill missing pre_probability_pct from valid legacy 1–5 scores only
  --    1→10, 2→30, 3→50, 4→70, 5→90. Do not touch post_probability_pct.
  -- -------------------------------------------------------------------------
  UPDATE public.riskai_risks
  SET pre_probability_pct = CASE pre_probability
    WHEN 1 THEN 10
    WHEN 2 THEN 30
    WHEN 3 THEN 50
    WHEN 4 THEN 70
    WHEN 5 THEN 90
  END
  WHERE pre_probability_pct IS NULL
    AND pre_probability IN (1, 2, 3, 4, 5);

  -- -------------------------------------------------------------------------
  -- 4) Probability %% CHECK constraints (0–100 when non-null)
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'riskai_risks_pre_probability_pct_range'
      AND conrelid = 'public.riskai_risks'::regclass
  ) THEN
    ALTER TABLE public.riskai_risks
      ADD CONSTRAINT riskai_risks_pre_probability_pct_range
      CHECK (
        pre_probability_pct IS NULL
        OR (pre_probability_pct >= 0 AND pre_probability_pct <= 100)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'riskai_risks_post_probability_pct_range'
      AND conrelid = 'public.riskai_risks'::regclass
  ) THEN
    ALTER TABLE public.riskai_risks
      ADD CONSTRAINT riskai_risks_post_probability_pct_range
      CHECK (
        post_probability_pct IS NULL
        OR (post_probability_pct >= 0 AND post_probability_pct <= 100)
      );
  END IF;
END $$;
