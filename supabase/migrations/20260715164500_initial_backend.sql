create schema if not exists cal_tracker_private;

revoke all on schema cal_tracker_private from public, anon, authenticated;

create or replace function cal_tracker_private.set_updated_at_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );
  return new;
end;
$$;

create or replace function cal_tracker_private.set_created_and_updated_at_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  server_timestamp text := to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );
begin
  if tg_op = 'INSERT' then
    new.created_at := server_timestamp;
  end if;
  new.updated_at := server_timestamp;
  return new;
end;
$$;

create or replace function cal_tracker_private.reject_ai_usage_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ai_usage_events rows are immutable'
    using errcode = '55000';
end;
$$;

revoke all on function cal_tracker_private.set_updated_at_text() from public;
revoke all on function cal_tracker_private.set_created_and_updated_at_text() from public;
revoke all on function cal_tracker_private.reject_ai_usage_event_mutation() from public;

create table public.food_entries (
  id text primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  local_date text not null,
  logged_at text not null,
  name text not null,
  calories integer not null,
  protein_g real not null,
  carbs_g real not null,
  fat_g real not null,
  source text not null,
  preset_id text,
  notes text,
  created_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  updated_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  deleted_at text,
  constraint food_entries_id_not_blank
    check (char_length(btrim(id)) between 1 and 100),
  constraint food_entries_local_date_format
    check (local_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint food_entries_logged_at_not_blank
    check (char_length(btrim(logged_at)) > 0),
  constraint food_entries_name_not_blank
    check (char_length(btrim(name)) between 1 and 200),
  constraint food_entries_nonnegative_nutrition
    check (
      calories >= 0
      and protein_g >= 0
      and carbs_g >= 0
      and fat_g >= 0
    ),
  constraint food_entries_source_allowed
    check (source in ('manual', 'preset', 'ai_text', 'ai_photo')),
  constraint food_entries_preset_id_not_blank
    check (preset_id is null or char_length(btrim(preset_id)) > 0)
);

create table public.presets (
  id text primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null,
  kind text not null,
  serving_label text,
  calories integer not null,
  protein_g real not null,
  carbs_g real not null,
  fat_g real not null,
  is_favorite integer not null default 0,
  sort_order integer not null default 0,
  created_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  updated_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  deleted_at text,
  constraint presets_id_not_blank
    check (char_length(btrim(id)) between 1 and 100),
  constraint presets_name_not_blank
    check (char_length(btrim(name)) between 1 and 200),
  constraint presets_kind_allowed
    check (kind in ('meal', 'item', 'portion')),
  constraint presets_nonnegative_nutrition
    check (
      calories >= 0
      and protein_g >= 0
      and carbs_g >= 0
      and fat_g >= 0
    ),
  constraint presets_favorite_boolean
    check (is_favorite in (0, 1)),
  constraint presets_serving_label_not_blank
    check (serving_label is null or char_length(btrim(serving_label)) > 0)
);

create table public.daily_goals (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  calories integer not null,
  protein_g real not null,
  carbs_g real not null,
  fat_g real not null,
  updated_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  constraint daily_goals_nonnegative_nutrition
    check (
      calories >= 0
      and protein_g >= 0
      and carbs_g >= 0
      and fat_g >= 0
    )
);

create table public.app_settings (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at text not null default to_char(
    pg_catalog.clock_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ),
  primary key (user_id, key),
  constraint app_settings_key_not_blank
    check (char_length(btrim(key)) between 1 and 100),
  constraint app_settings_value_size
    check (octet_length(value) <= 10000)
);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  estimation_source text not null,
  model text not null,
  input_tokens integer not null,
  cached_input_tokens integer not null default 0,
  output_tokens integer not null,
  estimated_cost_micros_usd bigint not null,
  pricing_version text not null,
  constraint ai_usage_events_source_allowed
    check (estimation_source in ('text', 'photo')),
  constraint ai_usage_events_model_not_blank
    check (char_length(btrim(model)) between 1 and 200),
  constraint ai_usage_events_token_counts_valid
    check (
      input_tokens >= 0
      and cached_input_tokens >= 0
      and cached_input_tokens <= input_tokens
      and output_tokens >= 0
    ),
  constraint ai_usage_events_cost_nonnegative
    check (estimated_cost_micros_usd >= 0),
  constraint ai_usage_events_pricing_version_not_blank
    check (char_length(btrim(pricing_version)) between 1 and 100)
);

create index idx_food_entries_user_date_logged_at
  on public.food_entries (user_id, local_date, logged_at desc);

create index idx_food_entries_user_date
  on public.food_entries (user_id, local_date);

create index idx_food_entries_user_preset
  on public.food_entries (user_id, preset_id);

create index idx_presets_user_favorite_sort
  on public.presets (
    user_id,
    is_favorite desc,
    sort_order asc,
    lower(name) asc
  );

create index idx_ai_usage_events_user_created_at
  on public.ai_usage_events (user_id, created_at desc);

create trigger set_food_entries_updated_at
before insert or update on public.food_entries
for each row execute function cal_tracker_private.set_created_and_updated_at_text();

create trigger set_presets_updated_at
before insert or update on public.presets
for each row execute function cal_tracker_private.set_created_and_updated_at_text();

create trigger set_daily_goals_updated_at
before insert or update on public.daily_goals
for each row execute function cal_tracker_private.set_updated_at_text();

create trigger set_app_settings_updated_at
before insert or update on public.app_settings
for each row execute function cal_tracker_private.set_updated_at_text();

create trigger reject_ai_usage_event_update_or_delete
before update or delete on public.ai_usage_events
for each row execute function cal_tracker_private.reject_ai_usage_event_mutation();

alter table public.food_entries enable row level security;
alter table public.presets enable row level security;
alter table public.daily_goals enable row level security;
alter table public.app_settings enable row level security;
alter table public.ai_usage_events enable row level security;

revoke all on table public.food_entries from anon, authenticated;
revoke all on table public.presets from anon, authenticated;
revoke all on table public.daily_goals from anon, authenticated;
revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.ai_usage_events from anon, authenticated;

grant select, insert, update, delete on table public.food_entries to authenticated;
grant select, insert, update, delete on table public.presets to authenticated;
grant select, insert, update, delete on table public.daily_goals to authenticated;
grant select, insert, update, delete on table public.app_settings to authenticated;
grant select on table public.ai_usage_events to authenticated;

create policy "food_entries_select_own"
on public.food_entries
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "food_entries_insert_own"
on public.food_entries
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "food_entries_update_own"
on public.food_entries
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "food_entries_delete_own"
on public.food_entries
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "presets_select_own"
on public.presets
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "presets_insert_own"
on public.presets
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "presets_update_own"
on public.presets
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "presets_delete_own"
on public.presets
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "daily_goals_select_own"
on public.daily_goals
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "daily_goals_insert_own"
on public.daily_goals
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "daily_goals_update_own"
on public.daily_goals
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "daily_goals_delete_own"
on public.daily_goals
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "app_settings_select_own"
on public.app_settings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "app_settings_insert_own"
on public.app_settings
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "app_settings_update_own"
on public.app_settings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "app_settings_delete_own"
on public.app_settings
for delete
to authenticated
using (user_id = (select auth.uid()));

create policy "ai_usage_events_select_own"
on public.ai_usage_events
for select
to authenticated
using (user_id = (select auth.uid()));
