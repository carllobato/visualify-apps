create index if not exists riskai_risks_created_by_idx
  on public.riskai_risks (created_by);

create index if not exists riskai_risks_closed_by_idx
  on public.riskai_risks (closed_by);

create index if not exists riskai_risks_last_reviewed_by_idx
  on public.riskai_risks (last_reviewed_by);
