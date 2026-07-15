# Cal Tracker — Implementation Sequence

## Delivery strategy

Build the app in vertical, usable slices. Each phase should leave the project compiling and preserve the architecture decisions in the other planning documents. Do not begin AI work until local entries, goals, and the review/edit boundary work correctly.

The implementation agent should use currently compatible package versions from the stable Expo SDK it scaffolds. It should not force versions from older examples.

## Phase 0 — Bootstrap and conventions

Deliver:

- A TypeScript Expo application configured for iPhone development.
- Expo Router root layout and four-tab navigation shell.
- Development-build app configuration with a unique iOS bundle identifier, custom URL scheme, automatic appearance support, and camera/photo permission messages.
- Supabase project configuration, Google Auth provider setup, and a clear separation between publishable runtime values and server-only secrets.
- `@react-native-google-signin/google-signin` and its Expo config plugin, with the Google iOS OAuth client configured for the app’s bundle identifier.
- ESLint, TypeScript strictness, import aliases if desired, and formatting conventions.
- Shared theme tokens and basic UI primitives.
- A `.gitignore` that excludes local secrets and generated native/build artifacts.

Exit condition:

- An Expo development build launches on an iPhone and shows all four tabs with themed placeholder screen composition only where a feature has not yet been built.

## Phase 1 — Identity, cloud persistence, and local cache

Deliver:

- Supabase Auth setup with Google Sign-In and session recovery.
- Supabase Postgres migrations, owner-only Row Level Security policies, and initial schema from `data-model.md`.
- SQLite cache initialization, cache migrations, and sync-operation queue.
- Typed domain models and repository APIs.
- Supabase client and deterministic local-first sync service.
- Local date and macro utility functions.

Exit condition:

- The app restores the signed-in user, reads cached data immediately, and syncs only that user’s rows under enforced RLS without raw SQL outside `src/db`.

## Phase 2 — Goals, manual entries, and Home

Deliver:

- First-run Google Sign-In followed by daily-goal setup.
- Settings goal editor with validation.
- Manual entry and entry-detail/edit/delete flows.
- Home dashboard with today’s four macro summaries, remaining amounts, and today’s entry list.
- Refresh/invalidation behavior so edits update the dashboard immediately.

Exit condition:

- A previously signed-in user can use the app offline to configure goals, add/edit/delete entries, and accurately see today’s totals; changes synchronize once connectivity returns.

## Phase 3 — Presets and quick logging

Deliver:

- Preset list, filtering, favorite state, create/edit/delete, and reorder behavior if included.
- Save-as-preset from an entry/review flow.
- Favorite preset quick-add from Home or Log.
- Undo or confirmation feedback after a one-tap preset log.

Exit condition:

- Preset logging creates a separate immutable entry snapshot, and later preset edits do not alter logged history.

## Phase 4 — Text AI estimation

Deliver:

- Supabase `estimate-nutrition` Edge Function with server-only OpenAI secret, JWT validation, size/rate limits, strict response schema, and error mapping.
- Versioned server-side model-price schedule and immutable per-user `ai_usage_events` writes from OpenAI-reported usage.
- Expo client for invoking the authenticated Edge Function.
- Text description screen and cancellable request state.
- Mandatory AI review/edit-before-save workflow.
- Manual-entry fallback from all error conditions.

Exit condition:

- A signed-in user can submit a textual portion description, correct the estimate if needed, and save it without the OpenAI key ever reaching the device. Each completed OpenAI request has one correctly attributed immutable cost event.

## Phase 5 — Photo AI estimation

Deliver:

- Camera and photo-library request/selection flow.
- Image resize/compression and in-memory encoding.
- Photo request integration using the same structured estimate schema.
- Home’s primary camera action.
- Permission, cancellation, network, and invalid-response behavior defined in `openai-integration.md`.

Exit condition:

- A user can analyze a meal photo, review its editable estimate, and save an entry. The app does not retain the source photo after the flow completes.

## Phase 6 — History and success overview

Deliver:

- Daily aggregate query and date-range utilities.
- Trend view with Week, Month, and Year period handling.
- One-macro-at-a-time chart with goal reference line and readable aggregation.
- Success grid for seven and 30 days using the documented default rule.
- Tapping a visual day opens its associated entries/day detail.

Exit condition:

- History views correctly represent dates with no logs, current daily goals, and each of the four macro dimensions without scanning the entire table unnecessarily.

## Phase 7 — Product polish and release readiness

Deliver:

- Loading, empty, error, and offline states for every user-visible route.
- Dynamic type, accessibility labels, keyboard avoidance, safe-area, and dark-mode review.
- Haptics only for meaningful success/destructive feedback if they fit the implemented UX.
- Image and chart performance pass on a physical iPhone.
- Settings cost summary showing estimated OpenAI API cost for this month and this year, with a last-refreshed state and no chart.
- App icon, splash assets, iOS build configuration, and TestFlight/personal-device installation instructions if distribution is desired.

Exit condition:

- The app is stable on a physical iPhone, keyboard and permissions flows are polished, and no secret or personal nutrition data is unintentionally exposed in logs or source control.

## Dependency ordering

```text
0 Bootstrap
  → 1 Persistence
    → 2 Manual logging + goals + Home
      → 3 Presets
      → 4 Text estimation
        → 5 Photo estimation
      → 6 History
        → 7 Polish/release
```

Phases 3 and 4 can proceed in either order once Phase 2 is complete. Phase 5 depends on the common estimation/review flow in Phase 4. Phase 6 depends on persistence and goals, not on OpenAI.

## Implementation guardrails

- Keep all local SQL inside repositories, all cloud data access behind the sync service, and all OpenAI request construction inside the Edge Function.
- Do not persist unreviewed AI results.
- Do not use the OpenAI key from environment variables embedded in the Expo app bundle.
- Keep Google Sign-In and email/password limited to identity/recovery; credentials remain managed by Supabase Auth.
- Use an Expo development build for Google Sign-In; Expo Go is not a version-1 runtime because it cannot load the Google native module or receive the required stable OAuth callback.
- Keep chart and success calculations deterministic and separate from UI components.
- Run the existing typecheck/lint commands after each phase and address diagnostics introduced by the work.
