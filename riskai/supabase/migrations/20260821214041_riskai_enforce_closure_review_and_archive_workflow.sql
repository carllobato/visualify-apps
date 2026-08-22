alter table public.riskai_risks
  add constraint riskai_risks_last_reviewed_by_fkey
  foreign key (last_reviewed_by)
  references auth.users(id)
  on delete set null;

create or replace function public.riskai_risks_apply_workflow_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_now timestamptz := now();
  v_is_closing boolean := false;
begin
  if tg_op = 'INSERT' then
    v_is_closing := new.status = 'Closed';
  else
    v_is_closing :=
      new.status = 'Closed'
      and old.status is distinct from 'Closed';

    if old.status = 'Archived'
       and new.status is distinct from old.status
       and new.status <> 'Draft' then
      raise exception using
        errcode = '23514',
        message = 'Archived risks can only be restored to Draft';
    end if;
  end if;

  if v_is_closing then
    if nullif(btrim(new.closure_note), '') is null then
      raise exception using
        errcode = '23514',
        message = 'A closure note is required when closing a risk';
    end if;

    new.closure_note := btrim(new.closure_note);
    new.closed_at := v_now;

    if v_actor is not null then
      new.closed_by := v_actor;
    elsif new.closed_by is null then
      raise exception using
        errcode = '23514',
        message = 'A closing user is required when closing a risk';
    end if;
  end if;

  new.last_reviewed_at := v_now;
  new.last_review_month := date_trunc('month', v_now)::date;

  if v_actor is not null then
    new.last_reviewed_by := v_actor;
  elsif tg_op = 'INSERT' then
    new.last_reviewed_by :=
      coalesce(new.last_reviewed_by, new.created_by);
  end if;

  return new;
end;
$function$;

drop trigger if exists riskai_risks_apply_workflow_audit
  on public.riskai_risks;

create trigger riskai_risks_apply_workflow_audit
before insert or update
on public.riskai_risks
for each row
execute function public.riskai_risks_apply_workflow_audit();

revoke all
on function public.riskai_risks_apply_workflow_audit()
from public, anon, authenticated;

create or replace function public.riskai_mark_risk_reviewed(
  p_project_id uuid,
  p_risk_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  if not public.visualify_can_write_project_content(p_project_id) then
    raise exception using
      errcode = '42501',
      message = 'Project write access is required';
  end if;

  update public.riskai_risks
  set
    last_reviewed_at = now(),
    last_review_month = date_trunc('month', now())::date,
    last_reviewed_by = (select auth.uid())
  where project_id = p_project_id
    and id = p_risk_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Risk not found';
  end if;
end;
$function$;

revoke all
on function public.riskai_mark_risk_reviewed(uuid, uuid)
from public, anon, service_role;

grant execute
on function public.riskai_mark_risk_reviewed(uuid, uuid)
to authenticated;
