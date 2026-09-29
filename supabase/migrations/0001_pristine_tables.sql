create table if not exists public.pristine_quote_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  category text not null,
  items jsonb not null default '[]'::jsonb,
  details text
);
create index if not exists pristine_quote_requests_email_idx on public.pristine_quote_requests (lower(email));

create table if not exists public.pristine_contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  topic text not null,
  message text not null
);

-- Server-only access with the secret key; no anon/public policies on purpose.
alter table public.pristine_quote_requests enable row level security;
alter table public.pristine_contact_messages enable row level security;
revoke all on public.pristine_quote_requests from anon, authenticated;
revoke all on public.pristine_contact_messages from anon, authenticated;
