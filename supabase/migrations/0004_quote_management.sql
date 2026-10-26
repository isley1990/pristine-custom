-- Manage quote requests from /admin: pipeline status, quoted price and private notes.
alter table public.pristine_quote_requests
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  add column if not exists quoted_total numeric(12, 2) check (quoted_total is null or quoted_total >= 0),
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists pristine_quote_requests_status_idx on public.pristine_quote_requests (status, id desc);
