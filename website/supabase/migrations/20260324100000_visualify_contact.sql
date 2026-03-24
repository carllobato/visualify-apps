-- Contact form submissions for Visualify marketing site
create table if not exists public.visualify_contact (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  company text,
  message text not null,
  source text,
  status text not null default 'new',
  notes text
);
