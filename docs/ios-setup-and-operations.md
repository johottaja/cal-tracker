# Cal Tracker — iPhone Setup and Operational Plan

## Development environment

The implementation agent should target a current stable Expo SDK and its matching Node.js requirements. Confirm the supported Node version and package compatibility from Expo’s current documentation before scaffolding.

Use a physical iPhone early, because camera permissions, Google Sign-In, image handling, and visual spacing differ from the simulator.

Required developer tooling:

- Node.js version supported by the chosen Expo SDK.
- An Expo account and an Expo development build installed on each development iPhone.
- Apple Developer configuration for iOS signing and a Google Cloud project with an iOS OAuth client.
- A Supabase project with Google configured as an Auth provider.
- An OpenAI API account and key supplied by the app owner.

## iOS configuration

Configure these values during app setup:

- iOS bundle identifier: choose a unique reverse-DNS identifier before creating a distributable build.
- Custom URL scheme: define a unique scheme for OAuth callbacks.
- Display name: `Cal Tracker`.
- `userInterfaceStyle`: automatic, so light/dark mode follows iOS.
- Camera usage description: explain that the camera is used to estimate nutrition from meal photos.
- Photo library usage description: explain that selected meal photos are analyzed for nutrition.

Only request photo/camera permission when the user selects that path. Do not prompt at first launch.

## Supabase and OpenAI setup

Before users install the app:

1. Create a Supabase project with Auth, Postgres, and Edge Functions enabled.
2. Create a Google iOS OAuth client for the app’s exact iOS bundle identifier, then configure its client ID/secret in the Supabase Google Auth provider.
3. Configure the Google Sign-In native module’s Expo config plugin and its required iOS configuration.
4. Apply the database migrations and Row Level Security policies.
5. Add the owner’s OpenAI key as a secret for the nutrition-estimation Edge Function.
6. Deploy the Edge Function.
7. Add only the Supabase project URL, publishable/anon key, and Google OAuth client identifiers required by the mobile client to the Expo app’s runtime configuration. These are not privileged secrets.

The OpenAI key stays only in the Edge Function’s secret environment. It is never entered in the app, bundled into Expo Go configuration, or available to friends using the app.

The app must never direct a user to add the OpenAI key to source code, a checked-in configuration file, or an `EXPO_PUBLIC_*` environment variable.

## Data lifecycle

- Nutrition entries, presets, goals, and non-secret preferences are durably stored in Supabase Postgres and protected by owner-only Row Level Security.
- Per-user AI usage events record model token usage and estimated API cost; they contain no meal description, image, or raw model response.
- The same data is cached in local SQLite for responsive offline use.
- The OpenAI key lives only in the Supabase Edge Function’s secret environment.
- A selected meal photo is resized and sent to the Edge Function, which sends it to OpenAI only when the user taps Analyze.
- The app does not retain the original image, derived base64 payload, raw prompt, or raw AI response after the review flow.
- Uninstalling the app removes the SQLite cache and session from that device, but not cloud records. Signing in again with the same Google or email/password account restores synchronized records.

## Network behavior

Network is required for first sign-in, synchronization, and text/photo estimation. After a user has signed in and data has synchronized at least once, the app remains usable offline for:

- Viewing the dashboard and history.
- Adding, editing, and deleting manual entries.
- Logging presets.
- Creating/editing presets.
- Editing goals.

When offline, local edits queue for synchronization. AI actions should give a clear message and allow manual logging. They must not silently queue AI requests or create duplicate logs.

## Development build and distribution

Version 1 uses an Expo development build, not Expo Go. Google Sign-In requires the native Google module, a custom URL scheme, and an app-specific iOS bundle identifier; Expo Go cannot supply those requirements.

Create and install the development build through EAS Build or a local Xcode build. Then start the JavaScript bundler with `npx expo start --dev-client`. Ordinary TypeScript/UI changes retain the familiar Expo fast-refresh workflow; rebuild the native app only after changing native dependencies, app configuration, or the Google Sign-In plugin.

Before the first distribution build:

- Verify the unique bundle identifier.
- Verify camera/photo permission text on a physical device.
- Verify Google Sign-In can restore the same Supabase user after an uninstall/reinstall.
- Confirm the OpenAI and Supabase service-role keys appear in neither source control nor app logs.
- Configure Apple signing through the selected Expo/EAS flow.

Expo’s free EAS tier is sufficient for early development. TestFlight is the appropriate later option if the friend should install a stable release; it requires an Apple Developer Program membership.

## Recovery and maintenance

Supabase plus Google Sign-In is the recovery mechanism: after a new install, the same Google identity restores the same user-scoped cloud records. The local cache must be treated as disposable.

Database migrations must be additive and versioned for both Supabase and SQLite. Before a release that changes schema, the implementation agent should verify the migration path from the previous installed schema, not only a fresh install.
