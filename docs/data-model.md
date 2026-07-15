# Cal Tracker — Data Model and Persistence Plan

## Storage principles

Supabase Postgres is the durable, user-scoped source of truth. It preserves records across app deletion after the user signs in again with Apple.

Expo SQLite is a local offline cache and mutation queue. The app reads its dashboard/history from SQLite for immediate performance, writes local changes first, and synchronizes them to Supabase when connectivity is available. Neither the OpenAI key nor the Supabase service-role key is stored on the device.

Nutrition amounts use:

- `calories`: whole-number kilocalories.
- `protein_g`, `carbs_g`, `fat_g`: decimal grams, rounded to one decimal place for display and storage.
- `local_date`: an ISO calendar date, `YYYY-MM-DD`, based on the device’s local timezone at log time.
- `logged_at`: ISO-8601 UTC timestamp for ordering entries within a day.

Amounts must be non-negative. Database reads return `0` for absent aggregate totals.

## Supabase tables

Every cloud table is protected by Row Level Security. Each policy limits `SELECT`, `INSERT`, `UPDATE`, and `DELETE` to rows where `user_id = auth.uid()`. The client must never be able to choose another user’s ID.

### `food_entries`

One logged meal, food item, portion, or manual correction.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `TEXT` | Yes | UUID generated on device. |
| `user_id` | `UUID` | Yes | Owner from Supabase Auth; assigned by the database from `auth.uid()`. |
| `local_date` | `TEXT` | Yes | Local calendar day used by dashboard and history queries. |
| `logged_at` | `TEXT` | Yes | UTC ISO timestamp used for ordering. |
| `name` | `TEXT` | Yes | User-visible description. |
| `calories` | `INTEGER` | Yes | Kilocalorie estimate or entered value. |
| `protein_g` | `REAL` | Yes | Protein in grams. |
| `carbs_g` | `REAL` | Yes | Carbohydrates in grams. |
| `fat_g` | `REAL` | Yes | Fat in grams. |
| `source` | `TEXT` | Yes | `manual`, `preset`, `ai_text`, or `ai_photo`. |
| `preset_id` | `TEXT` | No | Origin preset when the entry was quick-added. |
| `notes` | `TEXT` | No | Optional user note or short AI assumption summary. |
| `created_at` | `TEXT` | Yes | UTC ISO timestamp. |
| `updated_at` | `TEXT` | Yes | UTC ISO timestamp. |
| `deleted_at` | `TEXT` | No | Tombstone timestamp used only for cross-device deletion sync. |

Constraints:

- `source` is constrained to the four listed values.
- Calories and all macro grams are greater than or equal to zero.
- A user-facing deletion creates a tombstone for sync, then the local cache removes the entry. A server cleanup job may permanently remove old tombstones after all active clients have had time to synchronize.

Indexes:

- `idx_food_entries_user_date_logged_at (user_id, local_date, logged_at DESC)` for the home list and a selected day.
- `idx_food_entries_user_date (user_id, local_date)` for range aggregation.
- `idx_food_entries_user_preset (user_id, preset_id)` for future preset analytics; it is optional but inexpensive.

### `presets`

Reusable macro snapshots that can be logged with one tap.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `TEXT` | Yes | UUID generated on device. |
| `user_id` | `UUID` | Yes | Owner from Supabase Auth. |
| `name` | `TEXT` | Yes | Preset label, such as “Breakfast oats”. |
| `kind` | `TEXT` | Yes | `meal`, `item`, or `portion`. |
| `serving_label` | `TEXT` | No | Optional display text, such as “1 bowl”. |
| `calories` | `INTEGER` | Yes | Snapshot kilocalories. |
| `protein_g` | `REAL` | Yes | Snapshot protein grams. |
| `carbs_g` | `REAL` | Yes | Snapshot carbohydrate grams. |
| `fat_g` | `REAL` | Yes | Snapshot fat grams. |
| `is_favorite` | `INTEGER` | Yes | Boolean used to surface quick-add presets. |
| `sort_order` | `INTEGER` | Yes | User-controlled order within a list. |
| `created_at` | `TEXT` | Yes | UTC ISO timestamp. |
| `updated_at` | `TEXT` | Yes | UTC ISO timestamp. |
| `deleted_at` | `TEXT` | No | Tombstone timestamp used for sync. |

Preset values are copied into a new `food_entries` row when logged. Editing or deleting a preset never alters historical entries.

Indexes:

- `idx_presets_user_favorite_sort (user_id, is_favorite DESC, sort_order ASC, name COLLATE NOCASE ASC)`.

### `daily_goals`

A one-row-per-user table holding the currently active macro targets.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `user_id` | `UUID` | Yes | Primary key and owner from Supabase Auth. |
| `calories` | `INTEGER` | Yes | Daily calorie goal. |
| `protein_g` | `REAL` | Yes | Daily protein goal. |
| `carbs_g` | `REAL` | Yes | Daily carbohydrate goal. |
| `fat_g` | `REAL` | Yes | Daily fat goal. |
| `updated_at` | `TEXT` | Yes | UTC ISO timestamp. |

Goals are current settings, not historical snapshots. History uses the current goals in version 1. If changing goals must later preserve historical targets, add a goal-history table in a migration rather than modifying existing entries.

### `app_settings`

Non-secret user preferences, scoped to one user.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `user_id` | `UUID` | Yes | First part of the composite primary key. |
| `key` | `TEXT` | Yes | Second part of the composite primary key. |
| `value` | `TEXT` | Yes | Serialized, validated setting value. |
| `updated_at` | `TEXT` | Yes | UTC ISO timestamp. |

Version 1 keys:

- `success_rule_version`: allows a later migration to change how the success grid is interpreted.

Do not store OpenAI credentials or Supabase privileged credentials in this table.

### `ai_usage_events`

An immutable per-user record of a completed OpenAI estimation request. It supports the in-app monthly and yearly cost totals without storing meal images, descriptions, or raw model output.

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Yes | Server-generated event ID. |
| `user_id` | `UUID` | Yes | Owner from the verified Edge Function JWT. |
| `created_at` | `TIMESTAMPTZ` | Yes | Server timestamp used for calendar-period totals. |
| `estimation_source` | `TEXT` | Yes | `text` or `photo`. |
| `model` | `TEXT` | Yes | Model identifier used for the completed request. |
| `input_tokens` | `INTEGER` | Yes | OpenAI-reported input token count. |
| `cached_input_tokens` | `INTEGER` | Yes | OpenAI-reported cached input tokens; zero when absent. |
| `output_tokens` | `INTEGER` | Yes | OpenAI-reported output token count. |
| `estimated_cost_micros_usd` | `BIGINT` | Yes | Attributed estimated API cost in millionths of a US dollar. |
| `pricing_version` | `TEXT` | Yes | Server-side pricing schedule version used for this calculation. |

The Edge Function is the only writer. RLS permits the signed-in owner to read their own rows but never insert, update, or delete them directly. The app displays summed cost with the label “Estimated OpenAI API cost”; it is not an invoice and excludes taxes, Supabase costs, and any OpenAI account-level adjustments.

Indexes:

- `idx_ai_usage_events_user_created_at (user_id, created_at DESC)` for current-month/current-year totals.

## Local SQLite cache

SQLite mirrors the user-owned cloud records needed for offline use, plus a `sync_operations` queue.

Each mirrored table includes `remote_updated_at` and, where applicable, `deleted_at`. Local cache rows are scoped to the currently signed-in Supabase user and are cleared on explicit sign-out to prevent one person from seeing another person’s cached data on a shared device.

`sync_operations` contains:

- A generated operation ID.
- Current authenticated `user_id`.
- Entity type and entity ID.
- Operation type: upsert or delete.
- Serialized payload snapshot.
- Created timestamp and retry metadata.

The queue is private implementation state; it is not synchronized itself. A successful remote write removes its operation. Repeated failures retain the operation and show a non-blocking sync status in Settings.

Cost totals are fetched from `ai_usage_events` when online and may be cached with a last-refreshed timestamp for display. The cache is read-only; it must never create or alter cost events.

## Migrations

Create a monotonically increasing migration runner in `src/db/migrations`. Each migration runs in a transaction and records its version in SQLite’s `PRAGMA user_version`.

Supabase migration sequence:

1. Create the user-owned nutrition/settings tables, `ai_usage_events`, and indexes.
2. Enable RLS for every table.
3. Add owner-only select/insert/update/delete policies based on `auth.uid()`.
4. Add database defaults/triggers so `user_id` is assigned from `auth.uid()` and server timestamps are authoritative.
5. Add deletion-tombstone cleanup only after the sync protocol is established.

SQLite has its own versioned migrations for cache tables and the sync queue. Repositories must be the only application code that knows table or column names. Schema changes require a new migration; never change a migration that can already have run on a device.

## Repository API

The executing agent should implement typed local repositories and a separate sync service, not a generic SQL interface:

### Entries

- `listEntriesForDate(localDate)`
- `getEntryById(id)`
- `createEntry(input)`
- `updateEntry(id, input)`
- `deleteEntry(id)`
- `getDailyTotals(startDate, endDate)`

`getDailyTotals` groups by `local_date`, sums all four trackables, orders ascending, and returns days that have records. The history feature fills date gaps in memory using its requested date range.

### Presets

- `listPresets({ favoritesOnly? })`
- `getPresetById(id)`
- `createPreset(input)`
- `updatePreset(id, input)`
- `deletePreset(id)`
- `setPresetFavorite(id, isFavorite)`
- `reorderPresets(orderedIds)`

### Goals and settings

- `getDailyGoals()`
- `updateDailyGoals(input)`
- `getSetting(key)`
- `setSetting(key, value)`

## Domain objects and calculated values

`MacroValues` is the common shape:

```text
calories: number
proteinG: number
carbsG: number
fatG: number
```

Derived values are never persisted:

- A day’s total macro values.
- Remaining macro values: `goal - consumed`.
- Goal progress: `consumed / goal`, guarded when a goal is zero.
- Success status for each macro/day.
- Chart datapoints and period labels.

## Local date policy

At creation or update, derive `local_date` from the device’s current local timezone and the selected log date. The entry editor may allow a user to change the date; if it does, recompute `local_date` and preserve a correctly corresponding `logged_at`.

Never group dashboard or history data by UTC date. That would assign late-night meals to the wrong day for users outside UTC.
