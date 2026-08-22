set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if exists (
    select 1
    from public.riskai_risks
    where applies_to is not null
      and lower(btrim(applies_to)) not in (
        'cost',
        'time',
        'schedule',
        'cost & time',
        'both'
      )
  ) then
    raise exception 'Unexpected applies_to values prevent safe normalization';
  end if;
end
$$;

update public.riskai_risks
set applies_to = case lower(btrim(applies_to))
  when 'cost' then 'Cost'
  when 'time' then 'Schedule'
  when 'schedule' then 'Schedule'
  when 'cost & time' then 'Both'
  when 'both' then 'Both'
end
where applies_to is not null
  and applies_to is distinct from case lower(btrim(applies_to))
    when 'cost' then 'Cost'
    when 'time' then 'Schedule'
    when 'schedule' then 'Schedule'
    when 'cost & time' then 'Both'
    when 'both' then 'Both'
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'riskai_risks_impact_type_allowed_check'
      and conrelid = 'public.riskai_risks'::regclass
  ) then
    alter table public.riskai_risks
      add constraint riskai_risks_impact_type_allowed_check
      check (
        (
          status = 'Draft'
          and (
            applies_to is null
            or applies_to in ('Cost', 'Schedule', 'Both')
          )
        )
        or
        (
          status <> 'Draft'
          and applies_to is not null
          and applies_to in ('Cost', 'Schedule', 'Both')
        )
      );
  end if;
end
$$;
