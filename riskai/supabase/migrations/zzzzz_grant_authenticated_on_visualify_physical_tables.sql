-- PostgREST requires privileges on the relation you query. z_visualify_physical_tables_and_compat_views.sql
-- granted on the legacy-name views (public.portfolios, public.projects, etc.), not on visualify_* / riskai_risks.
-- After those views are dropped, restore the same authenticated privileges on the physical tables.

GRANT SELECT ON public.visualify_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.visualify_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visualify_portfolios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visualify_portfolio_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visualify_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visualify_project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riskai_risks TO authenticated;
