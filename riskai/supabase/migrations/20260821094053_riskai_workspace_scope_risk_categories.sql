create temporary table riskai_category_seed_data
on commit drop
as
select name, is_active, created_at, updated_at
from public.riskai_risk_categories;

drop policy if exists "Risk categories are viewable"
  on public.riskai_risk_categories;

delete from public.riskai_risk_categories;

alter table public.riskai_risk_categories
  drop constraint riskai_risk_categories_name_key;

alter table public.riskai_risk_categories
  add column workspace_id uuid not null;

alter table public.riskai_risk_categories
  add constraint riskai_risk_categories_workspace_id_fkey
    foreign key (workspace_id)
    references public.visualify_workspaces(id)
    on delete cascade,
  add constraint riskai_risk_categories_name_not_blank
    check (btrim(name) <> '');

create unique index riskai_risk_categories_workspace_name_normalized_uidx
  on public.riskai_risk_categories (workspace_id, lower(btrim(name)));

insert into public.riskai_risk_categories (
  workspace_id,
  name,
  is_active,
  created_at,
  updated_at
)
select
  workspaces.workspace_id,
  seed.name,
  seed.is_active,
  seed.created_at,
  seed.updated_at
from (
  select distinct workspace_id
  from public.visualify_projects
) workspaces
cross join riskai_category_seed_data seed
on conflict do nothing;

insert into public.riskai_risk_categories (
  workspace_id,
  name,
  is_active
)
select
  p.workspace_id,
  min(btrim(r.category)) as name,
  true
from public.riskai_risks r
join public.visualify_projects p
  on p.id = r.project_id
where r.category is not null
  and btrim(r.category) <> ''
group by p.workspace_id, lower(btrim(r.category))
on conflict do nothing;

create policy riskai_workspace_categories_select
on public.riskai_risk_categories
for select
to authenticated
using (
  public.is_workspace_member(workspace_id, (select auth.uid()))
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_risk_categories.workspace_id
      and public.can_read_project(p.id, (select auth.uid()))
  )
);

create policy riskai_workspace_categories_insert
on public.riskai_risk_categories
for insert
to authenticated
with check (
  public.has_workspace_member_role(
    workspace_id,
    array['owner'::text, 'admin'::text],
    (select auth.uid())
  )
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_risk_categories.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

create policy riskai_workspace_categories_update
on public.riskai_risk_categories
for update
to authenticated
using (
  public.has_workspace_member_role(
    workspace_id,
    array['owner'::text, 'admin'::text],
    (select auth.uid())
  )
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_risk_categories.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
)
with check (
  public.has_workspace_member_role(
    workspace_id,
    array['owner'::text, 'admin'::text],
    (select auth.uid())
  )
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_risk_categories.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

create policy riskai_workspace_categories_delete
on public.riskai_risk_categories
for delete
to authenticated
using (
  public.has_workspace_member_role(
    workspace_id,
    array['owner'::text, 'admin'::text],
    (select auth.uid()))
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_risk_categories.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

alter table public.riskai_risk_categories enable row level security;

revoke all on table public.riskai_risk_categories from anon, authenticated;
grant select, insert, update, delete
  on table public.riskai_risk_categories
  to authenticated;
grant select, insert, update, delete
  on table public.riskai_risk_categories
  to service_role;
