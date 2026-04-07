-- Standalone projects: portfolio link is optional (API omits portfolioId).
-- RLS already allows insert when owner_user_id = auth.uid(); SELECT includes rows
-- where owner_user_id = auth.uid() without requiring portfolio_id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'visualify_projects'
      AND column_name = 'portfolio_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.visualify_projects
      ALTER COLUMN portfolio_id DROP NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.visualify_projects.portfolio_id IS
  'Optional portfolio scope; NULL means the project is not linked to a portfolio.';
