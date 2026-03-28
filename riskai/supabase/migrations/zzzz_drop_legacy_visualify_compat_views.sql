-- Drop legacy PostgREST compatibility views (public.profiles, public.projects, etc.).
-- Physical tables are unchanged: visualify_* and riskai_risks.
-- Idempotent: safe when views were already removed manually.

DROP VIEW IF EXISTS public.profiles;
DROP VIEW IF EXISTS public.products;
DROP VIEW IF EXISTS public.projects;
DROP VIEW IF EXISTS public.project_members;
DROP VIEW IF EXISTS public.portfolios;
DROP VIEW IF EXISTS public.portfolio_members;
DROP VIEW IF EXISTS public.risks;
