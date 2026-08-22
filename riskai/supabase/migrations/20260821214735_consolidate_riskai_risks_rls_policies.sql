drop policy if exists "riskai_risks_delete_access" on public.riskai_risks;
drop policy if exists "risks_delete_own_project" on public.riskai_risks;
drop policy if exists "riskai_risks_insert_access" on public.riskai_risks;
drop policy if exists "risks_insert_own_project" on public.riskai_risks;
drop policy if exists "Users can view accessible risks" on public.riskai_risks;
drop policy if exists "risks_select_strict" on public.riskai_risks;
drop policy if exists "riskai_risks_update_access" on public.riskai_risks;
drop policy if exists "risks_update_own_project" on public.riskai_risks;

create policy "riskai_risks_select"
on public.riskai_risks
for select
using (
  public.can_read_project(project_id, (select auth.uid()))
);

create policy "riskai_risks_insert"
on public.riskai_risks
for insert
with check (
  public.visualify_can_write_project_content(project_id)
);

create policy "riskai_risks_update"
on public.riskai_risks
for update
using (
  public.visualify_can_write_project_content(project_id)
)
with check (
  public.visualify_can_write_project_content(project_id)
);

create policy "riskai_risks_delete"
on public.riskai_risks
for delete
using (
  public.visualify_can_write_project_content(project_id)
);
