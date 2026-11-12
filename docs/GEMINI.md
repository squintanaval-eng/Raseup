# ReuseUp: Gemini API

The scanner and photo missions call `POST /api/analizar` using `gemini-2.5-flash`.
The key stays on the Vercel server, never in client code or this repository.

## Configuration

Set `GEMINI_API_KEY` on the Vercel **reuseup** project for the intended environment:
Production for main; Preview for the design/accounts branch. `GOOGLE_API_KEY` is
also supported as a server-only fallback. Do not use a Supabase or Vercel API key.
After changing an environment variable create a NEW deployment. An old deployment
URL keeps its old environment. A code change cannot supply a missing secret.

## Safe diagnostic

Open `/api/analizar` on the exact site you are using. GET does not call Google or
spend Gemini quota. `configured` checks only that a key is present; it does NOT
prove the key is valid or that the project has access/quota. Expected release:
`gemini-25-fix-1`. The diagnostic never returns keys, key prefixes or images.

POST preserves `resultado` for the scanner and `aprobado`/`mensaje` for missions.
Errors include a stable `code` and a Spanish explanation. There is no automatic
fallback to another model. Invalid/missing mission JSON never awards points.

## Limits and verification

Keep images at or below 3 MiB. Base64 adds about one third to the request size;
Vercel Functions limit requests to 4.5 MB. The Google request is aborted after
45 seconds, below the configured 60-second function duration.

Run `node --test tests/gemini-api.test.cjs`. These are local API contract/error
handling tests with a mocked Google transport, NOT a successful live Gemini call.
A complete live test still needs the correct secret in the exact deployment.

## Model availability (checked November 11, 2026)

Google says 2.5 Flash API access is limited to existing users until December 1,
2026, after which requests to that model will route to 3.5 Flash-Lite. This change
uses 2.5 Flash as requested and reports a model-access error instead of silently
changing models. Review the configuration again before that date.

Official references:
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/structured-output
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/functions/limitations
