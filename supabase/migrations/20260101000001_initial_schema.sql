-- LexaFlow initial schema
-- Apply with: supabase db push

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── word_saves ───────────────────────────────────────────────────────────────
create table if not exists public.word_saves (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  word            text not null,
  source_lang     text not null check (source_lang in ('nl', 'en', 'tr')),
  target_lang     text not null check (target_lang in ('nl', 'en', 'tr')),
  definition_snapshot jsonb not null,
  created_at      timestamptz not null default now(),

  -- prevent duplicate saves for same user + word + lang pair
  unique (user_id, word, source_lang, target_lang)
);

create index if not exists word_saves_user_id_idx on public.word_saves (user_id);
create index if not exists word_saves_created_at_idx on public.word_saves (user_id, created_at desc);

-- ─── lookup_events (streak tracking) ─────────────────────────────────────────
create table if not exists public.lookup_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_date date not null default current_date,

  unique (user_id, event_date)
);

create index if not exists lookup_events_user_idx on public.lookup_events (user_id, event_date desc);

-- ─── user_settings ────────────────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  language_pair       text not null default 'nl-en'
                        check (language_pair in ('nl-en', 'en-nl', 'en-tr', 'tr-en')),
  show_phonetic       boolean not null default true,
  require_double_click boolean not null default false,
  updated_at          timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.word_saves enable row level security;
alter table public.lookup_events enable row level security;
alter table public.user_settings enable row level security;

-- word_saves policies
create policy "Users can read own word saves"
  on public.word_saves for select
  using (auth.uid() = user_id);

create policy "Users can insert own word saves"
  on public.word_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own word saves"
  on public.word_saves for delete
  using (auth.uid() = user_id);

-- lookup_events policies
create policy "Users can read own lookup events"
  on public.lookup_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own lookup events"
  on public.lookup_events for insert
  with check (auth.uid() = user_id);

-- user_settings policies
create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);
