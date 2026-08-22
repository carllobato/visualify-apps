-- Legacy rows may still use the mitigated synonym (see riskFieldSemantics / prior title-case migration).
update public.riskai_risks
set status = 'Mitigating'
where lower(btrim(status)) = 'mitigated';

do $$
begin
  if exists (
    select 1
    from public.riskai_risks
    where status is null
       or lower(btrim(status)) not in (
         'draft',
         'open',
         'monitoring',
         'mitigating',
         'closed',
         'archived'
       )
  ) then
    raise exception 'Cannot enforce RiskAI statuses: unexpected or null status values exist';
  end if;
end
$$;

update public.riskai_risks
set status = case lower(btrim(status))
  when 'draft' then 'Draft'
  when 'open' then 'Open'
  when 'monitoring' then 'Monitoring'
  when 'mitigating' then 'Mitigating'
  when 'mitigated' then 'Mitigating'
  when 'closed' then 'Closed'
  when 'archived' then 'Archived'
end
where status is distinct from case lower(btrim(status))
  when 'draft' then 'Draft'
  when 'open' then 'Open'
  when 'monitoring' then 'Monitoring'
  when 'mitigating' then 'Mitigating'
  when 'mitigated' then 'Mitigating'
  when 'closed' then 'Closed'
  when 'archived' then 'Archived'
end;

alter table public.riskai_risks
  alter column status set default 'Draft',
  alter column status set not null;

alter table public.riskai_risks
  add constraint riskai_risks_status_allowed_check
  check (
    status in (
      'Draft',
      'Open',
      'Monitoring',
      'Mitigating',
      'Closed',
      'Archived'
    )
  );
