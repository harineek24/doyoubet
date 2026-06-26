-- DevQuest initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) after
-- creating your project and enabling Google as an Auth provider.

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  domain text not null default 'generic' check (domain in ('generic', 'cs_sde')),
  learning_style text not null default 'spontaneous' check (learning_style in ('spontaneous', 'structured')),
  active_tenant_id uuid,
  updated_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('study', 'build', 'network')),
  name text not null,
  accent_color text not null default 'emerald' check (accent_color in ('emerald', 'purple')),
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

create table wheel_slices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants on delete cascade,
  label text not null,
  description text,
  color text not null default '#34d399',
  weight numeric not null default 1
);

create table wheel_spin_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants on delete cascade,
  slice_id uuid not null references wheel_slices on delete set null,
  spun_at timestamptz not null default now()
);

create table ego_bank_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants on delete cascade,
  title text not null,
  tags text[] not null default '{}',
  thumbnail_url text,
  markdown_body text not null default '',
  is_xp_token boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table xp_progress (
  tenant_id uuid primary key references tenants on delete cascade,
  level int not null default 1,
  current_xp int not null default 0,
  xp_to_next_level int not null default 100,
  total_deposits int not null default 0,
  updated_at timestamptz not null default now()
);

create table search_index_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants on delete cascade,
  title text not null,
  type text not null check (type in ('topic', 'doc', 'link')),
  url text not null,
  keywords text[] not null default '{}'
);

create table workbench_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants on delete cascade,
  topic_id uuid,
  content text not null default '',
  content_type text not null default 'text' check (content_type in ('code', 'text')),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'flagged')),
  pushed_to_github boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security: every row is reachable only by its owning user,
-- either directly (user_id) or via tenant_id -> tenants.user_id.

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table tenants enable row level security;
alter table wheel_slices enable row level security;
alter table wheel_spin_results enable row level security;
alter table ego_bank_entries enable row level security;
alter table xp_progress enable row level security;
alter table search_index_items enable row level security;
alter table workbench_submissions enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own preferences" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tenants" on tenants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own wheel slices" on wheel_slices
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );

create policy "own spin results" on wheel_spin_results
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );

create policy "own ego bank entries" on ego_bank_entries
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );

create policy "own xp progress" on xp_progress
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );

create policy "own search index items" on search_index_items
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );

create policy "own workbench submissions" on workbench_submissions
  for all using (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from tenants t where t.id = tenant_id and t.user_id = auth.uid())
  );
