-- Shared tracks: lets a user publish a custom subject so others can clone it via a share link

create table shared_tracks (
  id             uuid    primary key default gen_random_uuid(),
  owner_id       uuid    not null references auth.users on delete cascade,
  local_track_id text    not null,
  title          text    not null,
  tagline        text    not null default '',
  track_data     jsonb   not null,
  share_token    text    not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at     timestamptz not null default now(),
  unique (owner_id, local_track_id)
);

alter table shared_tracks enable row level security;

-- Owner has full control
create policy "owner manage shared tracks" on shared_tracks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Anyone (including anonymous) can read a track to accept an invite
create policy "public read by token" on shared_tracks
  for select using (true);
