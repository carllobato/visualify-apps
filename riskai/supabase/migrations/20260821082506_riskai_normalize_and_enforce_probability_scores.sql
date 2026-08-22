set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if exists (
    select 1
    from public.riskai_risks
    where pre_probability is not null
      and (
        pre_probability < 1
        or pre_probability > 5
        or pre_probability <> trunc(pre_probability)
      )
      and not (
        pre_probability > 5
        and pre_probability = pre_probability_pct
        and pre_probability_pct between 0 and 100
      )
  ) then
    raise exception 'Unexpected pre_probability values prevent safe normalization';
  end if;

  if exists (
    select 1
    from public.riskai_risks
    where post_probability is not null
      and (
        post_probability < 1
        or post_probability > 5
        or post_probability <> trunc(post_probability)
      )
      and not (
        post_probability > 5
        and post_probability = post_probability_pct
        and post_probability_pct between 0 and 100
      )
  ) then
    raise exception 'Unexpected post_probability values prevent safe normalization';
  end if;
end
$$;

update public.riskai_risks
set pre_probability = case
  when pre_probability_pct <= 20 then 1
  when pre_probability_pct <= 40 then 2
  when pre_probability_pct <= 60 then 3
  when pre_probability_pct <= 80 then 4
  else 5
end
where pre_probability > 5
  and pre_probability = pre_probability_pct
  and pre_probability_pct between 0 and 100;

update public.riskai_risks
set post_probability = case
  when post_probability_pct <= 20 then 1
  when post_probability_pct <= 40 then 2
  when post_probability_pct <= 60 then 3
  when post_probability_pct <= 80 then 4
  else 5
end
where post_probability > 5
  and post_probability = post_probability_pct
  and post_probability_pct between 0 and 100;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'riskai_risks_pre_probability_score_range'
      and conrelid = 'public.riskai_risks'::regclass
  ) then
    alter table public.riskai_risks
      add constraint riskai_risks_pre_probability_score_range
      check (
        pre_probability is null
        or (
          pre_probability between 1 and 5
          and pre_probability = trunc(pre_probability)
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'riskai_risks_post_probability_score_range'
      and conrelid = 'public.riskai_risks'::regclass
  ) then
    alter table public.riskai_risks
      add constraint riskai_risks_post_probability_score_range
      check (
        post_probability is null
        or (
          post_probability between 1 and 5
          and post_probability = trunc(post_probability)
        )
      );
  end if;
end
$$;
