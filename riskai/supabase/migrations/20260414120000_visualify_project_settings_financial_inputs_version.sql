-- 1 = legacy scaled inputs per financial_unit (onboarding / older saves).
-- 2 = major currency for project_value_input, contingency_value_input, delay_cost_per_day (RiskAI project settings).

DO $$
BEGIN
  IF to_regclass('public.visualify_project_settings') IS NOT NULL THEN
    ALTER TABLE public.visualify_project_settings
      ADD COLUMN IF NOT EXISTS financial_inputs_version smallint NOT NULL DEFAULT 1;
  END IF;
END $$;
