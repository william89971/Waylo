# Waylo

> See what changes before you change your plan.

Waylo is an evidence-grounded academic decision simulator for community-college transfer students. It turns transcripts, transfer requirements, and real-life constraints into validated academic routes students can review with a counselor.

This OpenAI Build Week project deeply supports six College of the Canyons university-program pathways across three destinations:

- UC Berkeley: Cognitive Science B.A. and Data Science B.A.
- UCLA: Cognitive Science B.S. and Statistics and Data Science B.S.
- UC San Diego: Cognitive Science B.S. and Data Science B.S.

The primary Build Week path is a four-stage, two-minute Judge Tour: consequence, intelligence and validation, evidence and trust, and counselor handoff. The final verified Preview URL is recorded in [`docs/PREVIEW_DEPLOYMENT.md`](docs/PREVIEW_DEPLOYMENT.md).

Waylo is a planning aid, not an official degree audit, admissions decision, or promise of transfer. Requirements, articulations, and course offerings change. Review the evidence and confirm the plan with a counselor before enrollment decisions.

## What the demo includes

- A consequence-first Judge Tour that moves Calculus I, shows the revised completion date and affected milestones, then leads into validation, evidence, and the Advisor Decision Packet.
- Three meaningfully different route strategies: fastest valid route, greatest verified overlap, and balanced workload.
- Deterministic prerequisite, duplicate-credit, known-offering, unit-limit, completion-grade, and route-coverage checks.
- A side-by-side what-if simulation derived from the prerequisite graph.
- A natural-language plan command that previews bounded changes, runs the deterministic simulator, and requires confirmation before saving.
- An Academic Twin workspace with a dependency canvas, semantic route focus, baseline/proposed/repaired Time Machine states, and an advisory workload model.
- Actionable uncertainty cards for exact-source review, editable counselor inquiries, supported alternate-route exploration, and separately labeled counselor confirmation.
- A visible seven-stage Evidence-to-Plan workflow for transcript screenshots and PDFs, plus a sanitized operational trace.
- A session-only Judge Mode that summarizes architecture, bounded academic coverage, validation outcomes, evidence status, and build-verification freshness without exposing private data.
- A controlled requirement-change fixture that demonstrates impact detection without claiming a real catalog, ASSIST, or university update.
- Evidence status, academic year, retrieval date, assumptions, and counselor-review items at the point of use.
- Transcript review, streamed planning-session events, and an advisor-ready printable summary.
- Login-free IndexedDB persistence using a strict, migrated `WayloWorkspaceV3` record.
- A fully functional seeded journey without an API key, plus genuine protected server-side GPT-5.6 Sol workflows.

## GPT-5.6 and the deterministic boundary

GPT-5.6 supports multimodal transcript extraction, unstructured-intent interpretation, ambiguity surfacing, and grounded explanation. Deterministic application code controls trusted identifiers, prerequisites, requirements, course offerings, unit limits, schedule generation, consequences, route acceptance, and confirmation-gated persistence.

The public judging path is intentionally seeded. Every recorded model-assisted result is labeled `Recorded GPT-5.6 demo result.` The tour states that it makes no OpenAI request and does not expose a live control that ends in a missing-key error.

## Build Week provenance

Waylo was created entirely inside the OpenAI Build Week submission period. The repository's initial commit, `da20ac2`, was authored on July 13, 2026 at 5:52 PM Pacific, after the submission period opened at 9:00 AM Pacific. No product code in this repository predates the event.

The dated Git history makes the event work inspectable: architecture and safety boundaries (`7598f2d`), the complete seeded product (`c119a95`), guided planning and evidence workflows (`0309078`), Academic Twin and deterministic candidate repair (`a7070cc`), protected live integration hardening (`b73d8cc`), the consequence-first Judge Tour (`4e53290`), and final judge-readiness evidence. [`docs/BUILD_WEEK_CHANGELOG.md`](docs/BUILD_WEEK_CHANGELOG.md) maps those revisions to the visible product.

## Local setup

Requirements: Node.js 22 or later and npm. The lockfile is committed for reproducible installs.

Windows PowerShell:

```powershell
git clone https://github.com/william89971/Waylo.git
Set-Location Waylo
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

macOS or Linux:

```bash
git clone https://github.com/william89971/Waylo.git
cd Waylo
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. No credential is required for seeded mode.

## Live and seeded modes

Seeded mode is always available and is the authoritative default public judge path. Its examples are labeled and deterministic; they never instantiate the OpenAI client or masquerade as live model output.

Live extraction, command parsing, and planning explanations are additionally protected by an explicit server mode, a signed 15-minute demo session, an approved-workflow allowlist, concurrency controls, and per-session response budgets. Adding a key alone does not enable live requests. The public deployment must keep `WAYLO_DEMO_MODE=seeded`.

For a future controlled live rehearsal, the user supplies all four server-side values in ignored `.env.local` or the deployment secret store:

```dotenv
OPENAI_API_KEY=your_key_here
WAYLO_DEMO_MODE=live
WAYLO_LIVE_DEMO_SIGNING_SECRET=an_independent_high_entropy_value
WAYLO_LIVE_DEMO_ACCESS_CODE=an_independent_demo_access_value
```

The protected session is issued only through `POST /api/demo-sessions` after the approved workflow and access code are validated; the signed token is returned as an HttpOnly, Secure, SameSite cookie. The implementation uses the official OpenAI JavaScript SDK, Responses API, strict Zod outputs and tools, and the explicit model ID `gpt-5.6-sol`. It uses `medium` reasoning for summaries and `high` for complex extraction. Although the pinned SDK schema accepts `xhigh`, it stays disabled until a user-supplied key confirms a live request accepts it. Waylo never creates or retrieves the key, and credentials must not be logged, displayed, or committed.

## Commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd start
```

The browser suite covers the four-stage Judge Tour, desktop and mobile flows, persistence, what-if comparison, evidence, print output, API health, and axe accessibility checks.

## API surface

- `GET /api/health` reports status, configured/not-configured state, model ID, seeded availability, and `xhigh` verification state—never configuration values.
- `POST /api/demo-sessions` creates a short-lived signed session only for the allowlisted live demo workflow; it is unavailable while the deployment is seeded-only.
- `POST /api/plan-commands/parse` converts a bounded natural-language request into validated `PlanChange` records. The client cannot invent course IDs.
- `POST /api/transcripts/extract` accepts seeded or live transcript text, PDF, PNG, JPEG, or WebP input. It preserves the JSON contract and can stream NDJSON progress events.
- `POST /api/planning-sessions` streams sanitized newline-delimited operational trace events.
- `POST /api/advisor-summary` returns a deterministic printable packet from server-reconstructed demo state. Public live advisor generation is disabled.
- `GET /api/judge-snapshot` returns a sanitized, bounded product snapshot and marks absent or stale build verification as unverified.
- `POST /api/requirement-changes/compare` compares an explicitly controlled requirement-version fixture and returns proposed affected route segments for review.

## Privacy and persistence

Only normalized confirmed profile, plan, simulation, evidence-resolution, Academic Twin, trace, and mode data are stored locally. Raw commands, unconfirmed previews, uploads, transcript text, counselor drafts, prompts, model responses, API responses, and secrets are excluded from `WayloWorkspaceV3`. V1 and V2 records migrate without retaining raw payloads. Server logs are limited to safe operational categories; they must not contain transcript/profile contents or model payloads.

## Academic-data limitations

V1 covers only the six pathways above. Program requirements and College of the Canyons course facts are connected to official source records. Exact institution-to-institution course articulations remain explicitly marked for ASSIST/counselor review where the curated dataset does not contain a verified agreement. Waylo does not extrapolate to unsupported schools or majors, predict admission, or guess unknown course offerings.

See [data coverage](docs/DATA_COVERAGE.md), [architecture](docs/ARCHITECTURE.md), [evaluation](docs/EVALUATION_REPORT.md), [Codex collaboration](docs/CODEX_USAGE.md), [judge testing instructions](docs/JUDGE_TESTING_INSTRUCTIONS.md), [human validation protocol](docs/HUMAN_VALIDATION.md), and the [Build Week requirements register](docs/HACKATHON_REQUIREMENTS.md).

## Deployment

Deploy with Vercel using the repository defaults and keep `WAYLO_DEMO_MODE=seeded`. A key by itself never enables live mode. Before any future multi-instance live deployment, replace the current process-local atomic session budget with a durable atomic store; until then, protected live mode is suitable only for a controlled single-instance rehearsal. Do not prefix any server value with `NEXT_PUBLIC_`. The repository is currently private, so final submission access must follow the private-repository sharing requirement documented in `HACKATHON_REQUIREMENTS.md`.

## License

[MIT](LICENSE)
