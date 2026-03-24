-- Early access signups for Visualify marketing site
create table if not exists public.visualify_signup (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text,
  last_name text,
  email text not null,
  job_title text,
  company text,
  source text,
  status text not null default 'new',
  notes text
);

create unique index if not exists visualify_signup_email_lower_idx
  on public.visualify_signup (lower(trim(email)));
