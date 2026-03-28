-- Forward-only: physical rename to visualify_* + riskai_risks, then legacy-name compatibility views.
--
-- This migration does not reference public.riskai_simulation_snapshots; it has no direct SQL dependency
-- on z_rename_simulation_snapshots_to_riskai.sql. The overall chain still applies z_rename_* before
-- z_visualify_rls_rpcs_and_riskai_risks_policies.sql (which needs the renamed snapshots table).
--
-- Prerequisites: prior migrations created public.products, profiles, portfolios, portfolio_members,
-- projects, project_members, and public.risks (and related FKs/triggers).
--
-- Idempotent for environments where renames were applied manually:
--   - Renames run only when the legacy name is a base table (relkind 'r') and the target name is free.
--   - Compatibility views are (re)created whenever the physical table exists.
--
-- Does NOT drop compatibility views. Does NOT modify historical migration files.

-- =============================================================================
-- 1) Renames (FKs/triggers/policies follow the renamed table in PostgreSQL)
-- =============================================================================

DO $$
DECLARE
  k "char";
BEGIN
  -- products -> visualify_products
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'products';
  IF k = 'r' AND to_regclass('public.visualify_products') IS NULL THEN
    ALTER TABLE public.products RENAME TO visualify_products;
  END IF;

  -- profiles -> visualify_profiles
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';
  IF k = 'r' AND to_regclass('public.visualify_profiles') IS NULL THEN
    ALTER TABLE public.profiles RENAME TO visualify_profiles;
  END IF;

  -- portfolios -> visualify_portfolios
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'portfolios';
  IF k = 'r' AND to_regclass('public.visualify_portfolios') IS NULL THEN
    ALTER TABLE public.portfolios RENAME TO visualify_portfolios;
  END IF;

  -- portfolio_members -> visualify_portfolio_members
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'portfolio_members';
  IF k = 'r' AND to_regclass('public.visualify_portfolio_members') IS NULL THEN
    ALTER TABLE public.portfolio_members RENAME TO visualify_portfolio_members;
  END IF;

  -- projects -> visualify_projects
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'projects';
  IF k = 'r' AND to_regclass('public.visualify_projects') IS NULL THEN
    ALTER TABLE public.projects RENAME TO visualify_projects;
  END IF;

  -- project_members -> visualify_project_members
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'project_members';
  IF k = 'r' AND to_regclass('public.visualify_project_members') IS NULL THEN
    ALTER TABLE public.project_members RENAME TO visualify_project_members;
  END IF;

  -- risks -> riskai_risks
  k := NULL;
  SELECT c.relkind INTO k
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'risks';
  IF k = 'r' AND to_regclass('public.riskai_risks') IS NULL THEN
    ALTER TABLE public.risks RENAME TO riskai_risks;
  END IF;
END $$;

-- =============================================================================
-- 2) Legacy-name views (security_invoker: RLS on physical tables applies)
-- =============================================================================

CREATE OR REPLACE VIEW public.products
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_products;

CREATE OR REPLACE VIEW public.profiles
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_profiles;

CREATE OR REPLACE VIEW public.portfolios
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_portfolios;

CREATE OR REPLACE VIEW public.portfolio_members
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_portfolio_members;

CREATE OR REPLACE VIEW public.projects
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_projects;

CREATE OR REPLACE VIEW public.project_members
WITH (security_invoker = true) AS
SELECT * FROM public.visualify_project_members;

CREATE OR REPLACE VIEW public.risks
WITH (security_invoker = true) AS
SELECT * FROM public.riskai_risks;

-- =============================================================================
-- 3) Grants (mirror typical authenticated access; physical tables retain existing grants)
-- =============================================================================

GRANT SELECT ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;

COMMENT ON TABLE public.visualify_profiles IS 'User profile rows (1:1 with auth.users.id). Legacy API name: public.profiles (view).';
COMMENT ON TABLE public.visualify_products IS 'Product catalog. Legacy API name: public.products (view).';
COMMENT ON TABLE public.visualify_portfolios IS 'Portfolios. Legacy API name: public.portfolios (view).';
COMMENT ON TABLE public.visualify_portfolio_members IS 'Portfolio membership. Legacy API name: public.portfolio_members (view).';
COMMENT ON TABLE public.visualify_projects IS 'RiskAI projects. Legacy API name: public.projects (view).';
COMMENT ON TABLE public.visualify_project_members IS 'Project membership. Legacy API name: public.project_members (view).';
COMMENT ON TABLE public.riskai_risks IS 'Risk register rows. Legacy API name: public.risks (view).';
