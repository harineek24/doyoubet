-- Stores each user's linked GitHub identity + access token, used by the
-- Workbench to push real submissions to a repo under their own account.

create table github_connections (
  user_id uuid primary key references auth.users on delete cascade,
  access_token text not null,
  github_username text not null,
  repo_full_name text,
  connected_at timestamptz not null default now()
);

alter table github_connections enable row level security;

create policy "own github connection" on github_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
