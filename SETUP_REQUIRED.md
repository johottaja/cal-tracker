# Cal Tracker — setup you still need to complete

The app code, local database, Supabase migration, and Edge Function are included. The remaining steps require accounts, credentials, signing, or a physical iPhone.

## 1. Use the supported toolchain

- Install Node.js 22.13 or newer. Node 22 LTS is the safest choice for Expo SDK 57.
- Install the current Xcode and accept its license.
- Install dependencies with `npm ci`.
- Sign in to Expo/EAS as `johocharger` with `npx eas login`.

## 2. iOS identity

The fixed iOS bundle identifier is `com.joonaslindroos.caltracker`. Use it in Apple signing and App Store Connect. The display name remains Cal Tracker.

Copy `.env.example` to `.env` and fill in every value. The `.env` file is ignored by Git.

Do not put an OpenAI key, Supabase secret key, or service-role key in the root `.env`. Every `EXPO_PUBLIC_*` value is bundled into the app.

## 3. Create and configure Supabase

1. Create a new Supabase project.
2. In Project Settings → API, copy the project URL and active publishable key into:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Install or invoke the Supabase CLI, sign in, and link this directory:
   - `npx supabase login`
   - `npx supabase link --project-ref YOUR_PROJECT_REF`
4. Apply the checked-in database migration with `npx supabase db push`.
5. In the Supabase SQL editor, confirm the five public tables exist and that Row Level Security is enabled on all of them.

Do not add a service-role or secret key to the mobile app. Supabase automatically supplies privileged credentials to the deployed Edge Function.

## 4. Configure sign-in providers

In Supabase Authentication → Providers → Email:

1. Enable email/password sign-in and user sign-ups.
2. Keep email confirmation enabled for production. The app tells new users to confirm their account and then sign in.
3. In Authentication → URL Configuration, set a valid Site URL for the confirmation page.
4. Configure the project password policy you want Supabase to enforce.

Email/password uses the existing Supabase URL and publishable key, so it does not require additional app environment variables or a native rebuild.

The current app uses email/password authentication. Google OAuth clients and native Google sign-in plugins are not required.

## 5. Configure and deploy OpenAI estimation

1. Create an OpenAI API key with an appropriate project budget and usage limits.
2. In Supabase Edge Function secrets, add `OPENAI_API_KEY`.
3. Leave `OPENAI_MODEL` unset to use the pinned default. The checked-in pricing schedule currently accepts `gpt-5-mini` and `gpt-5-mini-2025-08-07`; update and verify the server-side pricing table before selecting any other model.
4. Deploy with `npx supabase functions deploy estimate-nutrition`.
5. Confirm the function keeps JWT verification enabled.

The OpenAI key belongs only in Supabase secrets. Never add it to `.env`, `.env.example`, Expo/EAS public variables, SQLite, or source control.

## 6. TestFlight and updates

Follow [the iOS release guide](docs/ios-setup-and-operations.md). EAS project linking, update channels, and production public backend variables are configured. After Apple enrollment, run `npm run build:testflight` for controlled testing, then `npm run build:production` for the external beta. These binaries run without a dev server.

For Expo Go development, `npm start` remains available. Physical iPhones require matching Expo accounts in the CLI and Expo Go.

## 7. Final acceptance checks

- Create and confirm an email/password account, sign in, force-close the app, and confirm the session restores.
- Set goals; create, edit, and delete an entry while online.
- Turn off networking; repeat manual entry, preset, goal, dashboard, and history actions; reconnect and confirm pending changes synchronize.
- Verify one user cannot read or change another user’s rows.
- Run text and photo estimates and confirm every result must be reviewed before it can be saved.
- Confirm photos and raw prompts/responses are not stored.
- Confirm each completed AI request adds one read-only `ai_usage_events` row and Settings shows month/year estimated cost.
- Check camera and photo-library permission text on a physical iPhone.
- Run `npm run typecheck`, `npm run lint`, and `npx expo-doctor` before each release.
- Review Supabase’s Security and Performance Advisors after applying migrations.

For TestFlight distribution, complete Apple enrollment/signing and beta review details. See the release guide for public invitations, update promotion, and rollback.
