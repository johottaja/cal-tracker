# Cal Tracker — setup you still need to complete

The app code, local database, Supabase migration, and Edge Function are included. The remaining steps require accounts, credentials, signing, or a physical iPhone.

## 1. Use the supported toolchain

- Install Node.js 22.13 or newer. Node 22 LTS is the safest choice for Expo SDK 57.
- Install the current Xcode and accept its license.
- Install dependencies with `npm install`.
- Sign in to Expo/EAS with `npx eas-cli@latest login`.

## 2. Choose the final iOS identity

Choose a bundle identifier you control, such as `com.yourname.caltracker`. It must be identical in Expo, Google Cloud, and Apple signing.

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

### Google Sign-In

In Google Cloud:

1. Create or select a Google Cloud project and configure its OAuth consent screen.
2. Create a **Web application** OAuth client. Keep its client ID and client secret.
3. Create an **iOS** OAuth client using the exact bundle identifier from step 2.
4. Copy the iOS client ID and its reversed form into `.env`:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID`

In Supabase Authentication → Providers → Google:

1. Enable Google.
2. Enter the Web client ID first and the iOS client ID second in **Client IDs**, separated by a comma.
3. Enter the Web client secret.
4. Enable **Skip nonce check** for the native iOS flow used by this app.

After changing any Google client ID, bundle identifier, URL scheme, or native plugin setting, rebuild the development client.

## 5. Configure and deploy OpenAI estimation

1. Create an OpenAI API key with an appropriate project budget and usage limits.
2. In Supabase Edge Function secrets, add `OPENAI_API_KEY`.
3. Leave `OPENAI_MODEL` unset to use the pinned default. The checked-in pricing schedule currently accepts `gpt-5-mini` and `gpt-5-mini-2025-08-07`; update and verify the server-side pricing table before selecting any other model.
4. Deploy with `npx supabase functions deploy estimate-nutrition`.
5. Confirm the function keeps JWT verification enabled.

The OpenAI key belongs only in Supabase secrets. Never add it to `.env`, `.env.example`, Expo/EAS public variables, SQLite, or source control.

## 6. Build and install the iPhone development client

1. Connect the Expo project to EAS with `npx eas-cli@latest build:configure`.
2. Create a development build with `npx eas-cli@latest build --profile development --platform ios`.
3. Complete Apple signing prompts and register the test iPhone when EAS asks.
4. Install the resulting build on the iPhone.
5. Start Metro from this directory with `npm start`, then open the installed Cal Tracker development client.

Expo Go cannot run this app because Google Sign-In uses a native module.

## 7. Final acceptance checks

- Create and confirm an email/password account, sign in, force-close the app, and confirm the session restores.
- Sign out, then sign in with Google and confirm that flow still works.
- Set goals; create, edit, and delete an entry while online.
- Turn off networking; repeat manual entry, preset, goal, dashboard, and history actions; reconnect and confirm pending changes synchronize.
- Verify one user cannot read or change another user’s rows.
- Run text and photo estimates and confirm every result must be reviewed before it can be saved.
- Confirm photos and raw prompts/responses are not stored.
- Confirm each completed AI request adds one read-only `ai_usage_events` row and Settings shows month/year estimated cost.
- Check camera and photo-library permission text on a physical iPhone.
- Run `npm run typecheck`, `npm run lint`, and `npx expo-doctor` before each release.
- Review Supabase’s Security and Performance Advisors after applying migrations.

For TestFlight or App Store distribution, also supply final icon/splash artwork, join the Apple Developer Program, create the App Store Connect record, review privacy disclosures, and build with the production EAS profile.
