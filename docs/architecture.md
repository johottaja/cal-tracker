# Cal Tracker — Architecture Plan

## Purpose and scope

Cal Tracker is an offline-capable calorie and macronutrient tracker for a small group of iPhone users. It tracks calories, protein, carbohydrates, and fat; supports manual logging, one-tap presets, and AI-assisted estimates from text or meal photos. Each user sees only their own data.

Version 1 intentionally excludes:

- Shared data, social features, and Android/web support.
- Persisting meal photos after estimation.
- Barcode scanning and external food databases.

The app must remain useful without a network connection for viewing cached data, adding/editing entries, setting goals, and adding presets. Synchronization and AI estimation require a connection.

## Decisions

| Concern | Decision | Reason |
| --- | --- | --- |
| App framework | Current stable Expo SDK, React Native, and TypeScript at implementation time | Fast iOS development with first-party native modules and a maintainable typed codebase. |
| Navigation | Expo Router | File-based routes with simple tab and modal composition. |
| Local cache | `expo-sqlite` | Gives instant offline reads/writes and efficient daily aggregation. It is not the durable source of record. |
| Durable data | Supabase Postgres | Persists across app deletion and synchronizes a user’s data after sign-in. |
| Identity | Supabase Auth with Google Sign-In and email/password | Gives users a choice of sign-in method while restoring the same private data after reinstall. |
| Authorization | Supabase Row Level Security (RLS) | Every user-owned row is readable/writable only by its authenticated `user_id`. |
| AI transport | Supabase Edge Function → OpenAI Responses API | Keeps the owner-supplied OpenAI key out of the Expo app and gives one controlled call boundary. |
| AI cost tracking | Server-recorded per-request usage events | Attributes estimated OpenAI API spend to the signed-in user without exposing the key or raw request data. |
| AI response handling | Strict structured JSON response validated locally with Zod | Prevents prose responses from entering nutrition records. |
| Images | Camera/gallery image is resized and sent for estimation, then discarded | Controls token and device-storage use; photo journaling is out of scope. |
| App state | Feature hooks plus a narrow context for database readiness and settings | Avoids unnecessary global-state infrastructure while keeping screens responsive. |
| Charts | A React Native chart library compatible with the chosen Expo SDK, backed by `react-native-svg` | Supports native, accessible trend charts without a WebView. |

## Important security boundaries

The app owner supplies the OpenAI key once as a Supabase Edge Function secret during backend deployment. The key must never be committed, placed in `EXPO_PUBLIC_*` variables, sent to the mobile app, logged, or saved in SQLite.

The Expo app may include the Supabase project URL and publishable/anon key because those identify the project rather than authenticate as an administrator. They do not replace RLS. The Supabase service-role key and OpenAI key are server-only secrets.

Google Sign-In or a confirmed email/password account is required to restore user-owned records after an uninstall. Passwords are handled only by Supabase Auth and are never stored by Cal Tracker.

## System boundaries and data flow

```text
User interaction
  │
  ├─ Manual entry / preset ───────────→ SQLite cache → sync queue → Supabase Postgres
  ├─ Text description ────────────────→ Edge Function → OpenAI → Review & edit
  └─ Photo → resize ──────────────────→ Edge Function → OpenAI → Review & edit
                                                                    │
Supabase Postgres ←────────────── authenticated sync ─────── SQLite cache
                                                                    │
SQLite aggregates ───────────────────────────────────────→ Dashboard / History
```

## Layering rules

### Routes: `app/`

Routes own navigation options and compose feature screens. They must not contain database SQL, OpenAI requests, or business calculations.

### Features: `src/features/`

Each feature owns its screen-level components, hooks, and domain actions:

- `dashboard`
- `entries`
- `estimation`
- `presets`
- `goals`
- `history`
- `settings`

Features may use shared repositories, utilities, and UI primitives. They must not import another feature’s route or reach into another feature’s private components.

### Shared UI: `src/components/`

Contains reusable, domain-light components such as buttons, screen layouts, numeric inputs, segmented controls, macro cards, and chart wrappers. A component becomes shared only after at least two feature consumers need it.

### Data access: `src/db/`

Owns schema migrations, transaction helpers, and repositories. SQL is limited to this layer. Repositories return typed domain objects rather than raw SQLite rows.

### Services: `src/services/`

Owns integrations and cross-cutting operations:

- Image resize/encoding.
- Supabase client, auth session access, and sync queue.
- Google Sign-In and email/password auth clients.
- Edge Function client for nutrition estimation.
- AI cost-summary client.
- Local date conversion.

### Domain: `src/domain/`

Pure types and deterministic functions for macro arithmetic, daily success calculation, input normalization, and date ranges. It must not depend on React Native, SQLite, or network APIs.

## Proposed project layout

```text
cal-tracker/
├── app/
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home
│   │   ├── log.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   ├── capture-photo.tsx
│   ├── text-estimate.tsx
│   ├── review-entry.tsx
│   ├── manual-entry.tsx
│   ├── presets.tsx
│   ├── preset-editor.tsx
│   └── entry-detail.tsx
├── src/
│   ├── components/
│   ├── constants/
│   ├── db/
│   ├── domain/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   │   ├── supabase/
│   │   ├── sync/
│   │   └── estimation/
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/
│       └── estimate-nutrition/
├── docs/
└── app.json
```

## UI system

Create a token-based design system before feature screens:

- `colors`: semantic values such as background, surface, text, muted text, border, primary, success, warning, and error.
- `macroColors`: stable, accessible colors for calories, protein, carbs, and fat.
- `spacing`, `radii`, `typography`, and sizing tokens.
- Light and dark theme definitions selected from the device appearance by default.

The style direction is modern iOS: generous spacing, clear hierarchy, rounded surfaces, restrained color, and direct actions. Macro values must never rely on color alone; every visual state needs a textual value or label.

## Error and loading conventions

- AI requests expose a cancellable in-progress state and prevent double submission.
- Invalid AI responses, network failures, sign-in failures, and denied camera permissions produce actionable, non-technical messages.
- An AI failure always offers manual entry as an exit path.
- Local database initialization occurs before routes read or write cached data.
- Local mutations update the cache immediately, enqueue a sync operation, and do not wait for a network round trip.
- A successful remote sync clears only its matching queued operation; conflict resolution uses server timestamps and deterministic last-write-wins for version 1.
- AI cost events are written only by the Edge Function after an OpenAI request completes; they are immutable and are not included in the offline mutation queue.

## Performance and privacy requirements

- Store both a timestamp and the derived local calendar date for each entry; do not repeatedly derive dates in chart queries.
- Restrict history queries to the selected visible range and aggregate in SQL.
- Resize meal images before uploading, with a maximum dimension around 1,024 pixels and JPEG compression appropriate for recognition.
- Do not retain original images, base64 payloads, or OpenAI responses after the review flow ends.
- Display estimated model API cost before taxes and apply the server-side pricing schedule effective when the request was made.
- Use an Expo development build on iPhone; the Google Sign-In native module and its config plugin are required. Do not use CloudKit.
- Do not add telemetry or third-party analytics beyond Supabase’s required service operations.
