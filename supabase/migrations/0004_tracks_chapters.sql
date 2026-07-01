-- Tracks: a subject/curriculum the user is building (e.g. "NumPy").
-- Builtin tracks stay hardcoded in src/lib/store/tracks.ts — this table
-- only holds user-created, AI-classified tracks.
create table tracks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null,
  tagline      text not null default '',
  accent_color text not null default '#f59e0b',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Chapters: grow incrementally as the user submits more notes over time.
-- raw_text accumulates verbatim; phase1/phase2 are regenerated in full
-- from raw_text whenever new content is classified into this chapter.
create table chapters (
  id              uuid primary key default gen_random_uuid(),
  track_id        uuid not null references tracks(id) on delete cascade,
  position        int not null default 0,        -- display order within track
  title           text not null,
  sub             text not null default '',       -- short kicker, <6 words
  summary         text not null default '',       -- 1-2 sentence summary — doubles as
                                                    -- classification context for future submissions
  tags            jsonb not null default '[]',
  accent          text not null,                   -- mechanical 8-color rotation (unchanged from contentagenticai)
  g1              text not null,
  g2              text not null,
  g3              text not null,
  raw_text        text not null default '',        -- accumulated verbatim notes, all submissions concatenated
  note_fragments  jsonb not null default '[]',      -- audit trail: [{submitted_at, raw_text, images}]
  phase1_scenes   jsonb,                            -- flashcards; null until first generation completes
  phase2_sections jsonb,                            -- [{order, display_mode, pull_quote, original_content, enhanced_content}]
  status          text not null default 'processing'
                    check (status in ('processing', 'ready', 'error')),
  error_msg       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index tracks_user_id_idx on tracks (user_id);
create index chapters_track_id_idx on chapters (track_id);
create index chapters_status_idx on chapters (status);

alter table tracks enable row level security;
alter table chapters enable row level security;

create policy "own tracks" on tracks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own chapters" on chapters
  for all
  using (
    exists (select 1 from tracks t where t.id = track_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from tracks t where t.id = track_id and t.user_id = auth.uid())
  );
