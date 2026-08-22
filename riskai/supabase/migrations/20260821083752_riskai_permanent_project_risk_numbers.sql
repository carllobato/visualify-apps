set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.riskai_project_risk_counters (
  project_id uuid primary key
    references public.visualify_projects(id) on delete cascade,
  last_risk_number integer not null,
  updated_at timestamp with time zone not null default now(),
  constraint riskai_project_risk_counters_last_number_check
    check (last_risk_number >= 0)
);

alter table public.riskai_project_risk_counters enable row level security;

revoke all on table public.riskai_project_risk_counters
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.riskai_project_risk_counters
  to service_role;

-- Legacy rows may still have NULL risk_number (allowed before this migration).
-- Assign stable per-project numbers before seeding counters or enforcing NOT NULL.
with project_max as (
  select
    project_id,
    coalesce(max(risk_number), 0) as max_num
  from public.riskai_risks
  group by project_id
),
null_rows as (
  select
    r.id,
    r.project_id,
    row_number() over (
      partition by r.project_id
      order by r.created_at nulls last, r.id
    ) as rn
  from public.riskai_risks r
  where r.risk_number is null
)
update public.riskai_risks r
set risk_number = pm.max_num + nr.rn
from null_rows nr
join project_max pm on pm.project_id = nr.project_id
where r.id = nr.id;

insert into public.riskai_project_risk_counters (
  project_id,
  last_risk_number
)
select
  project_id,
  coalesce(max(risk_number), 0)
from public.riskai_risks
group by project_id
on conflict (project_id) do update
set
  last_risk_number = greatest(
    public.riskai_project_risk_counters.last_risk_number,
    excluded.last_risk_number
  ),
  updated_at = now();

create or replace function public.riskai_risks_enforce_risk_number()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'UPDATE' then
    if new.project_id is distinct from old.project_id then
      raise exception 'A risk cannot be moved to another project';
    end if;

    new.risk_number := old.risk_number;
    return new;
  end if;

  insert into public.riskai_project_risk_counters (
    project_id,
    last_risk_number
  )
  values (
    new.project_id,
    1
  )
  on conflict (project_id) do update
  set
    last_risk_number =
      public.riskai_project_risk_counters.last_risk_number + 1,
    updated_at = now()
  returning last_risk_number
  into new.risk_number;

  return new;
end;
$function$;

revoke execute
  on function public.riskai_risks_enforce_risk_number()
  from public, anon, authenticated;

alter table public.riskai_risks
  alter column risk_number set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'riskai_risks_risk_number_positive_check'
      and conrelid = 'public.riskai_risks'::regclass
  ) then
    alter table public.riskai_risks
      add constraint riskai_risks_risk_number_positive_check
      check (risk_number > 0);
  end if;
end
$$;

drop index if exists public.riskai_risks_project_id_risk_number_unique;
