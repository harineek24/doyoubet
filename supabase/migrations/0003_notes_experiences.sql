-- Notes: stores user's raw notes input verbatim
create table notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null default '',
  raw_text    text not null,
  images      jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- Experiences: AI-generated output, cached forever — never recomputed for the same note
create table experiences (
  id              uuid primary key default gen_random_uuid(),
  note_id         uuid not null references notes(id) on delete cascade unique,
  status          text not null default 'processing'
                    check (status in ('processing', 'ready', 'error')),
  phase1_script   jsonb,
  phase2_sections jsonb,
  error_msg       text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index notes_user_id_idx on notes (user_id);
create index experiences_note_id_idx on experiences (note_id);
create index experiences_status_idx on experiences (status);

alter table notes enable row level security;
alter table experiences enable row level security;

create policy "own notes" on notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own experiences" on experiences
  for all
  using (
    exists (select 1 from notes n where n.id = note_id and n.user_id = auth.uid())
  )
  with check (
    exists (select 1 from notes n where n.id = note_id and n.user_id = auth.uid())
  );
