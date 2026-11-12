# ReuseUp chat and vivid palette

The chat is part of ReuseUp; EcoBot remains an independent project.
`visual.js` loads `vivid.css` and `chat.js` as an additive enhancement, preserving the existing scanner/account/game code.

- Pine, lime, violet and amber highlights; existing white readable surfaces.
- Dedicated Chat IA tab and home shortcut, four prompts, Enter / Shift+Enter, temporary context, stop, retry, reset and copy.
- Text is rendered via textContent, never as model HTML. Chat is cleared on reload or account change.
- Messages go to Google Gemini; they are not stored in our database or browser storage. Provider retention is governed by the project's Google terms/settings.
- POST /api/chat sends at most 21 alternating messages, 4000 characters per message and 24000 total characters.
- GEMINI_API_KEY (or GOOGLE_API_KEY) stays server-side. Optional GEMINI_CHAT_MODEL; default matches the project's working gemini-3-flash-preview. No automatic provider/model switching.
- Server timeout 45 seconds; client timeout 50 seconds; Vercel chat function maxDuration 60 seconds.
- Best-effort 12 requests/minute per IP per function instance. This is NOT a distributed quota or a substitute for authentication/WAF limits. Configure persistent quotas and a spending cap before wide public access.
- Chat cannot award points, verify mission evidence, read account records, search the web or analyze photos. Scanner and missions remain separate.

Tests: `node --test tests/chat-api.test.cjs`; `python tests/chat-browser.py` after installing Playwright and Chromium. Browser tests use real frontend code with Auth and Gemini responses mocked; they do not prove a live Google response. CI saves responsive screenshots for visual review.
