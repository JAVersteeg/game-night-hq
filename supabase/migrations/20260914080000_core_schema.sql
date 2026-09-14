-- Core schema for Game Night HQ.
--
-- Primary keys are uuid rather than `bigint identity`: these ids travel to a mobile client and
-- appear in invite/deep links, so non-enumerable ids matter more here than the index locality a
-- sequential key would buy. Every table in this app is small enough that v4 fragmentation is moot.

create type public.scoring_direction as enum ('highest_total_wins', 'lowest_total_wins');
create type public.session_status as enum ('in_progress', 'completed');
create type public.bonus_operator as enum ('==', '>', '<', '>=', '<=');

-- A display name is mandatory, so no profile row exists until onboarding collects one. The app
-- treats "session but no profile" as the signal to show the display-name prompt.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- `created_by` is nullable with ON DELETE SET NULL throughout: losing the person who created a
-- group or template must never take the group's history with them.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid references auth.users (id) on delete set null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- The composite PK already serves group_id lookups; user_id needs its own index for "my groups".
create index group_members_user_id_idx on public.group_members (user_id);

create table public.game_templates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  scoring_direction public.scoring_direction not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);
create index game_templates_group_id_idx on public.game_templates (group_id);

-- `position` is not in the CLAUDE.md sketch; it exists so the live entry form renders fields in a
-- stable, author-chosen order instead of whatever order the rows come back in.
create table public.game_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.game_templates (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  sign smallint not null default 1 check (sign in (-1, 1)),
  default_value numeric not null default 0,
  position integer not null default 0,
  unique (template_id, key)
);
create index game_template_fields_template_id_idx on public.game_template_fields (template_id);

-- The composite FK on (template_id, field_key) is what stops a bonus rule from pointing at a field
-- that does not exist on its own template, and makes renaming/removing a field cascade correctly.
create table public.bonus_rules (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.game_templates (id) on delete cascade,
  field_key text not null,
  operator public.bonus_operator not null,
  value numeric not null,
  points_delta numeric not null,
  created_at timestamptz not null default now(),
  foreign key (template_id, field_key)
    references public.game_template_fields (template_id, key)
    on update cascade on delete cascade
);
create index bonus_rules_template_fk_idx on public.bonus_rules (template_id, field_key);

-- ON DELETE RESTRICT on template_id and scorekeeper_id: a template or member that has been used in
-- a recorded session cannot be deleted out from under that history.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  template_id uuid not null references public.game_templates (id) on delete restrict,
  scorekeeper_id uuid not null references auth.users (id) on delete restrict,
  status public.session_status not null default 'in_progress',
  played_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sessions_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);
create index sessions_template_id_idx on public.sessions (template_id);
create index sessions_scorekeeper_id_idx on public.sessions (scorekeeper_id);
-- History and stats always read a single group newest-first.
create index sessions_group_played_at_idx on public.sessions (group_id, played_at desc);

create table public.session_participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (session_id, user_id)
);
create index session_participants_user_id_idx on public.session_participants (user_id);

-- The FK targets session_participants rather than sessions+users separately, so a score row can
-- only exist for someone actually playing, and dropping a participant takes their scores with it.
create table public.session_scores (
  session_id uuid not null,
  user_id uuid not null,
  field_key text not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id, field_key),
  foreign key (session_id, user_id)
    references public.session_participants (session_id, user_id)
    on delete cascade
);
