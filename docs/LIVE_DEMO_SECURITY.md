# Protected live-demo boundary

Waylo's public deployment is seeded-only. `WAYLO_DEMO_MODE` defaults to `seeded`, and seeded requests branch before any OpenAI client or Responses call is created.

## Approved live workflow

Future controlled rehearsal sessions may enable only the `waylo-academic-twin-demo-v1` workflow:

1. Issue a signed 15-minute session through `POST /api/demo-sessions` using a server-side access code.
2. Run at most one transcript extraction.
3. Run at most two plan-command interpretations.
4. Run at most one planning explanation, with no more than two Responses turns.

The advisor-summary live path is disabled. Every live route verifies the signed HttpOnly cookie and server-owned session state before provider access. Client-supplied pathway and route identifiers are resolved against the six-pathway dataset; profiles, catalogs, constraints, and route objects are reconstructed server-side.

## Hard limits

| Boundary | Limit |
| --- | --- |
| JSON request | 256 KB |
| Command | 300 characters |
| Transcript text | 12,000 characters |
| Image | One file, 2 MB, approximately 4 megapixels |
| PDF | One file, 2 MB, two pages |
| Concurrent live work | One request per session |
| Responses creations | Six per session, including continuations |
| Command output | 3,000 tokens |
| Transcript output | 6,000 tokens |
| Planning output | 4,000 tokens per turn |
| Planning turns | Two |
| SDK retry count | One |

OpenAI storage is disabled for these calls. A privacy-safe random request ID is returned to the browser. Logs contain only request ID, endpoint, mode, outcome, sanitized category, and duration; they never accept transcript text, profile data, prompts, model responses, file contents, filenames, access codes, credentials, or secrets.

## Deployment blocker

The session ledger is deliberately process-local for the contained implementation. It provides atomic limits in one server process and is sufficient for keyless tests and a controlled single-instance rehearsal. It is not a global quota across multiple Vercel instances. Keep public live mode disabled until the ledger is replaced with a durable, atomic, expiring store shared by every instance.
