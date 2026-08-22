alter table public.riskai_project_owners
  add column workspace_id uuid;

update public.riskai_project_owners o
set workspace_id = p.workspace_id
from public.visualify_projects p
where p.id = o.project_id;

alter table public.riskai_project_owners
  alter column workspace_id set not null;

drop policy if exists "Users can view accessible project owners"
  on public.riskai_project_owners;
drop policy if exists project_owners_delete_own_project
  on public.riskai_project_owners;
drop policy if exists project_owners_insert_own_project
  on public.riskai_project_owners;
drop policy if exists project_owners_update_own_project
  on public.riskai_project_owners;

alter table public.riskai_project_owners
  drop constraint riskai_project_owners_project_id_fkey,
  drop constraint riskai_project_owners_unique_name_per_project;

alter table public.riskai_project_owners
  drop column project_id;

alter table public.riskai_project_owners
  add constraint riskai_project_owners_workspace_id_fkey
    foreign key (workspace_id)
    references public.visualify_workspaces(id)
    on delete cascade,
  add constraint riskai_project_owners_name_not_blank
    check (btrim(name) <> '');

-- Same owner label may exist on multiple projects in one workspace; keep one row per normalized name.
delete from public.riskai_project_owners o
using public.riskai_project_owners dup
where o.workspace_id = dup.workspace_id
  and lower(btrim(o.name)) = lower(btrim(dup.name))
  and o.id > dup.id;

create unique index riskai_project_owners_workspace_name_normalized_uidx
  on public.riskai_project_owners (workspace_id, lower(btrim(name)));

insert into public.riskai_project_owners (workspace_id, name, is_active)
select
  p.workspace_id,
  min(btrim(r.owner)) as name,
  true
from public.riskai_risks r
join public.visualify_projects p
  on p.id = r.project_id
where r.owner is not null
  and btrim(r.owner) <> ''
group by p.workspace_id, lower(btrim(r.owner))
on conflict do nothing;

create policy riskai_workspace_owners_select
on public.riskai_project_owners
for select
to authenticated
using (
  public.is_workspace_member(workspace_id, (select auth.uid()))
  or exists (
    select 1
    from public.visualify_projects p
    where p.workspace_id = riskai_project_owners.workspace_id
      and public.can_read_project(p.id, (select auth.uid()))
  )
);

create policy riskai_workspace_owners_insert
on public.riskai_project_owners
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
    where p.workspace_id = riskai_project_owners.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

create policy riskai_workspace_owners_update
on public.riskai_project_owners
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
    where p.workspace_id = riskai_project_owners.workspace_id
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
    where p.workspace_id = riskai_project_owners.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

create policy riskai_workspace_owners_delete
on public.riskai_project_owners
for delete
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
    where p.workspace_id = riskai_project_owners.workspace_id
      and public.visualify_can_write_project_content(p.id)
  )
);

alter table public.riskai_project_owners enable row level security;

revoke all on table public.riskai_project_owners from anon, authenticated;
grant select, insert, update, delete
  on table public.riskai_project_owners
  to authenticated;
grant select, insert, update, delete
  on table public.riskai_project_owners
  to service_role;
