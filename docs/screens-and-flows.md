# Cal Tracker — Screens and Interaction Flows

## Navigation map

The root navigator contains four tabs and stack/modal routes for focused tasks.

```text
Tabs
├── Home
├── Log
├── History
└── Settings

Stack or modal routes
├── Capture photo
├── Text estimate
├── Review entry
├── Manual entry
├── Entry detail
├── Presets
└── Preset editor
```

The active tab remains visible only for the four top-level screens. Capture, review, edit, and preset-management tasks use a full screen or modal presentation so the user has an unambiguous cancel/back action.

## Home

Home answers “how am I doing today?” immediately.

Required content, ordered by priority:

1. Local date and a concise daily summary.
2. Four macro summaries: calories, protein, carbohydrates, and fat. Each shows consumed, goal, and remaining amount.
3. A prominent primary “Take photo” action.
4. Secondary fast actions for Text estimate, Quick add preset, and Manual entry.
5. Today’s entries in reverse chronological order with source-aware icons/labels.

Use progress rings or bars consistently. The progress representation must show a numeric value alongside color and should remain understandable when a goal is exceeded.

Tapping an entry opens Entry Detail. Long-press/swipe deletion may be added only when it includes a confirmation or undo affordance.

## Log

Log is an action-first hub for ways to add food:

- Take or select photo.
- Describe food in text.
- Choose a favorite preset.
- Browse all presets.
- Create a manual entry.

Favorite presets should be visible without a search step. A one-tap preset action immediately logs its stored macro snapshot for today, then gives brief confirmation and an Undo action. The preset must have an accessible secondary path to inspect/edit it rather than making the only tap ambiguous.

## Capture photo

The capture screen offers:

- Open camera.
- Choose from photo library.
- Optional concise context input.
- A short privacy explanation that the chosen image is sent to OpenAI for analysis.

Once an image is selected, show a preview and an “Analyze meal” action. Do not call the API automatically just because an image was selected.

## Text estimate

The text flow contains:

- Multiline description field with a focused prompt: “Describe the food and portion.”
- Analyze action.
- Link to manual entry.

Preserve the typed description while an estimate fails or the user returns from a recoverable error.

## Review entry

Review is used for both AI and manual/preset-derived data when an edit is needed.

It contains:

- Editable name.
- Editable calories, protein, carbs, and fat.
- Editable log date.
- AI-only confidence and serving assumptions.
- Save entry action.
- Optional “Save as preset” choice or route.
- Cancel/discard action.

Saving returns to Home and immediately refreshes that day’s totals and list. If the user chose Save as preset, save the entry first, then present a prefilled Preset Editor without changing the confirmed entry.

## Manual entry

Manual entry uses the same validated macro field controls as Review Entry but has no AI context. It defaults the date to today and opens directly from Home and Log.

## Entry detail

Entry Detail shows the stored entry exactly as it contributes to totals:

- Name, date/time, source, and optional notes.
- Four macro values.
- Edit action.
- Delete action with confirmation.
- “Save as preset” action, unless a duplicate-preset guard is later added.

Editing updates only that entry. It must never change a preset that originated it.

## Presets

The Presets screen supports reusable meals, items, and portions:

- Favorites appear first.
- Filter or segmented selector: All, Meals, Items, Portions.
- Search by name once the list is large enough to justify it.
- Add preset action.
- Each row has name, serving label, macro summary, and favorite state.

The Preset Editor supports create and edit:

- Name, kind, optional serving label.
- Editable four macro values.
- Favorite toggle.
- Save and delete actions as appropriate.

One-tap logging always uses a preset snapshot. Preset edits only affect future one-tap logs.

## History

History contains a segmented switch between Trend and Success.

### Trend

- Period control: Week, Month, Year.
- Macro control: Calories, Protein, Carbs, Fat. Only one macro is plotted at a time.
- Daily total chart with an explicit goal reference line.
- Date labels appropriate to the selected period.
- Tapping a day opens a filtered day detail/list.

Period semantics:

- Week: seven local calendar days ending today.
- Month: current local calendar month.
- Year: current local calendar year, displayed as daily data only if legible; otherwise aggregate into calendar months while clearly labeling the aggregation.

### Success

- Period control: last 7 days or last 30 days.
- Four macro rows and one day per column.
- Each cell has a visible state and accessible label: met, not met, or no logged data.
- A legend explains the state colors.

The default success definition is:

| Trackable | Day succeeds when |
| --- | --- |
| Calories | Consumed is at or below the daily goal. |
| Protein | Consumed is at or above the daily goal. |
| Carbohydrates | Consumed is at or below the daily goal. |
| Fat | Consumed is at or below the daily goal. |

“No logged data” is distinct from “not met.” The success rule is isolated in a pure domain function so it can become configurable later.

## Settings

Settings has six sections:

1. Daily goals: editable values for calories, protein, carbohydrates, and fat.
2. Account: signed-in account state, restore-session action, and sign-out action with an explanation that it removes only the local cache.
3. Sync: last successful synchronization time, pending-change count, retry action, and an explanation that data is backed up to the user’s private Supabase account.
4. AI cost: two clear values—“This month” and “This year”—showing the user’s estimated attributable OpenAI API cost in USD. Include the timestamp last refreshed and a concise note that it is not a billing invoice.
5. Appearance: follows system in version 1; an explicit override can be deferred.
6. Privacy: explain Supabase storage, owner-only access controls, and the photo-analysis data boundary.

Saving goals updates Home and History calculations immediately. A warning is not necessary in version 1 because goals are intentionally current settings applied to past comparisons too.

Cost totals are intentionally not graphed in version 1. The initial implementation sums USD usage events over the device’s current local calendar month and year, then formats them as USD. A later preference can add local-currency conversion, but it must use a documented exchange-rate source rather than silently implying an exact billed amount.

## First-run flow

1. Open app to a compact onboarding/setup screen.
2. Require Google Sign-In or email/password authentication before creating cloud-backed data. State that this restores the user’s private data after reinstall.
3. Ask for daily macro goals with reasonable editable defaults.
4. Enter Home.

The app remains usable offline after an initial signed-in synchronization. If the session is absent or expired, the app must restore it before synchronization or AI estimation; local cached views remain readable.

## Accessibility and interaction requirements

- All controls have clear accessibility labels and hit targets suitable for iOS.
- Macro progress, chart points, and success cells include textual or screen-reader equivalents.
- Numeric inputs use an appropriate decimal keyboard for macro grams.
- Destructive actions require confirmation or a brief Undo.
- Respect dynamic text sizing and safe-area insets.
