# Cal Tracker — OpenAI Estimation Plan

## Goal

OpenAI provides a best-effort nutrition estimate for a described food/portion or a submitted meal image. It does not directly create a food entry. Every estimate goes to an editable review screen, and only an explicit user confirmation persists it.

## API and model selection

Use the OpenAI Responses API with a vision-capable model that supports structured outputs. At implementation time, verify the currently supported model names and structured-output format in the official OpenAI documentation; do not hard-code an obsolete model from this plan.

The default should favor cost and latency for a small private group. Keep the selected model as a server-side Edge Function configuration; do not expose per-user model selection in the mobile app.

The Expo development-build app sends an authenticated request to a Supabase Edge Function named `estimate-nutrition`. The function authenticates the Supabase user, applies a conservative per-user rate limit, then calls OpenAI with the OpenAI key stored as a Supabase secret.

The client must:

- Attach the current Supabase access token only to the Edge Function request.
- Never receive, store, log, or send an OpenAI API key.
- Fail early with sign-in recovery guidance when there is no valid Supabase session.

The Edge Function must:

- Read the OpenAI key only from its server-side secret environment.
- Verify the caller’s JWT before accepting the request.
- Enforce a request-size limit and basic per-user rate limit before calling OpenAI.
- Never write the key, raw image payload, or full OpenAI response to logs.
- Return only the validated structured estimate or a safe error response.

## Cost event recording

After OpenAI returns a successfully parsed estimate, the Edge Function reads the API response’s usage fields and writes one immutable `ai_usage_events` row for the authenticated user.

The function calculates `estimated_cost_micros_usd` from a versioned, server-side model-price schedule that separately accounts for input, cached input when reported, and output tokens. The schedule must live in Edge Function configuration/code, not in the mobile bundle, and every event stores its `pricing_version`.

Record a cost event even if the user later cancels or declines the estimate review: the OpenAI request has already consumed billable resources. Do not record an event when no OpenAI request was made or the request failed before a billable response was returned.

The app must not treat the event total as an OpenAI invoice. It is an attributable estimate that excludes taxes, Supabase costs, and account-level credits/adjustments.

## Input paths

### Text estimate

The user enters an ordinary phrase such as “half an avocado” or “chicken pasta, one medium bowl”.

1. Trim whitespace and require non-empty text.
2. Send the description to the estimation service.
3. Parse and validate the structured result.
4. Open Review Entry with `source = ai_text`.

### Photo estimate

The user takes a photo or chooses one from their library. An optional text field lets them add context such as “only the food on the left”.

1. Request the minimum camera or photo-library permission needed for the chosen action.
2. Resize the image to a maximum dimension near 1,024 pixels and compress it before encoding.
3. Send it to the authenticated Edge Function with the optional caption.
4. Parse and validate the structured result.
5. Open Review Entry with `source = ai_photo`.
6. Release image URI/base64 data when the screen unmounts or the flow is cancelled.

The app should state that photos are sent through Cal Tracker’s secure estimation service to OpenAI for analysis and are not saved by Cal Tracker.

## Structured response contract

Use the API’s strict JSON-schema response feature. The exact SDK/request syntax can change, but the semantic schema must remain:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | Short display label for the logged food/meal. |
| `calories` | integer | Non-negative kilocalories. |
| `protein_g` | number | Non-negative grams. |
| `carbs_g` | number | Non-negative grams. |
| `fat_g` | number | Non-negative grams. |
| `confidence` | string enum | `low`, `medium`, or `high`. |
| `assumptions` | string | Short explanation of serving size and uncertain ingredients. |

The client validates the parsed JSON using a matching Zod schema before it enters React state. Reject a result that is missing a required field, has a negative macro value, exceeds a sensible defensive upper bound, or cannot be parsed.

## Prompt requirements

The system instruction must make the model:

- Act as a nutrition estimation assistant, not a medical advisor.
- Estimate the edible food actually described or visible, including likely cooking fats/sauces only when reasonably implied.
- Prefer a conservative realistic serving-size assumption when portion size is unclear.
- Return all four requested trackables for every estimate.
- Use grams for macros and kilocalories for calories.
- Return only the configured structured response.
- Clearly describe its key assumption in the `assumptions` field.
- Never claim precision the input cannot support.

The user content contains the text description, photo, or both. Do not ask the model to identify a user, infer health conditions, or provide diet advice.

## Review before save

The Review Entry screen is a mandatory boundary between AI output and records:

- Show name, calories, protein, carbohydrates, and fat in editable numeric controls.
- Show `confidence` and assumptions as secondary context.
- Let the user change the entry date and name.
- Provide Save, Cancel, and “Save as preset” actions.
- Allow a transition to a manual entry form if the result is unusable.

When saved, the entry stores the user-edited values and original source. It does not store the raw prompt, photo, response body, or confidence value in version 1.

## Failure handling

| Situation | App behavior |
| --- | --- |
| Missing/expired session | Explain that a signed-in account is required to use AI estimates and link to the account recovery action. |
| Offline/network failure | Explain that AI estimation needs a connection; retain text input when possible and offer manual entry. |
| Camera/photo permission denied | Explain why the permission is needed and offer gallery or text/manual logging. |
| User cancels camera or picker | Return without creating an entry or error toast. |
| API rate limit or quota error | State that the estimate could not be generated and offer retry/manual entry; do not expose the key. |
| Invalid structured response | Retry only on explicit user action, then offer manual entry. |
| User cancels while waiting | Abort the request if the transport supports it and discard any late result. |

## Cost and reliability controls

- Limit the submitted image size before upload.
- Keep prompts concise and do not include historical meal data.
- Use one model request per explicit user action; never auto-submit while typing.
- Disable the submit action while a request is active.
- Keep retry user-initiated to avoid unexpected cost.
- Treat all values as estimates, including high-confidence responses.
- Persist cost events server-side only after usage is known; never accept a client-provided cost amount.

## Owner key provisioning

The app owner supplies the OpenAI key once, outside the mobile app:

1. Create the Supabase project.
2. Add the OpenAI key to the `estimate-nutrition` Edge Function’s secret environment using Supabase’s secret-management command/dashboard.
3. Deploy the Edge Function.
4. Confirm the secret is not present in the Expo app config, `.env` files committed to source, browser/mobile logs, or Supabase table data.

All app users share the service-owned OpenAI quota in this version. If per-user billing is later required, design a separate paid-key or account-credit system; do not collect users’ OpenAI keys in the app without a new security review.
