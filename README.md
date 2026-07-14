# Waylo

> Find your way through college.

Waylo helps California community-college students find a clear path through college. Students can compare transfer and major pathways, build semester-by-semester routes, test a change before committing to it, understand blockers, and print a plan to review with a counselor.

This OpenAI Build Week project deeply supports six College of the Canyons university-program pathways across three destinations:

- UC Berkeley: Cognitive Science B.A. and Data Science B.A.
- UCLA: Cognitive Science B.S. and Statistics and Data Science B.S.
- UC San Diego: Cognitive Science B.S. and Data Science B.S.

[Open the deployed Waylo demo](https://waylo-phi.vercel.app)

Waylo is a planning aid, not an official degree audit, admissions decision, or promise of transfer. Requirements, articulations, and course offerings change. Review the evidence and confirm the plan with a counselor before enrollment decisions.

## What the demo includes

- Three meaningfully different route strategies: fastest valid route, greatest verified overlap, and balanced workload.
- Deterministic prerequisite, duplicate-credit, known-offering, unit-limit, completion-grade, and route-coverage checks.
- A side-by-side what-if simulation derived from the prerequisite graph.
- A natural-language plan command that previews bounded changes, runs the deterministic simulator, and requires confirmation before saving.
- Actionable uncertainty cards for exact-source review, editable counselor inquiries, supported alternate-route exploration, and separately labeled counselor confirmation.
- A visible seven-stage Evidence-to-Plan workflow for transcript screenshots and PDFs, plus a sanitized operational trace.
- Evidence status, academic year, retrieval date, assumptions, and counselor-review items at the point of use.
- Transcript review, streamed planning-session events, and an advisor-ready printable summary.
- Login-free IndexedDB persistence using a strict, migrated `WayloWorkspaceV2` record.
- A fully functional seeded journey without an API key, plus optional server-side GPT-5.6 Sol workflows.

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

Seeded mode is always available and is the default public judge path. Its examples are labeled and deterministic; they never masquerade as live model output.

To enable live extraction, planning explanations, and advisor summaries, the user must add a server-side key to the ignored `.env.local` file:

```dotenv
OPENAI_API_KEY=your_key_here
```

The implementation uses the official OpenAI JavaScript SDK, Responses API, strict Zod outputs and tools, and the explicit model ID `gpt-5.6-sol`. It uses `medium` reasoning for summaries and `high` for complex extraction. Although the pinned SDK schema accepts `xhigh`, it stays disabled until a user-supplied key confirms a live request accepts it. Waylo never creates or retrieves the key, and the key must not be logged, displayed, or committed.

## Commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd start
```

The browser suite covers desktop and mobile flows, persistence, what-if comparison, evidence, print output, API health, and axe accessibility checks.

## API surface

- `GET /api/health` reports status, configured/not-configured state, model ID, seeded availability, and `xhigh` verification state—never configuration values.
- `POST /api/plan-commands/parse` converts a bounded natural-language request into validated `PlanChange` records. The client cannot invent course IDs.
- `POST /api/transcripts/extract` accepts seeded or live transcript text, PDF, PNG, JPEG, or WebP input. It preserves the JSON contract and can stream NDJSON progress events.
- `POST /api/planning-sessions` streams sanitized newline-delimited operational trace events.
- `POST /api/advisor-summary` returns a structured printable summary from validated workspace state.

## Privacy and persistence

Only normalized confirmed profile, plan, simulation, evidence-resolution, trace, and mode data are stored locally. Raw commands, unconfirmed previews, uploads, transcript text, counselor drafts, prompts, model responses, API responses, and secrets are excluded from `WayloWorkspaceV2`. Server logs are limited to safe operational categories; they must not contain transcript/profile contents or model payloads.

## Academic-data limitations

V1 covers only the six pathways above. Program requirements and College of the Canyons course facts are connected to official source records. Exact institution-to-institution course articulations remain explicitly marked for ASSIST/counselor review where the curated dataset does not contain a verified agreement. Waylo does not extrapolate to unsupported schools or majors, predict admission, or guess unknown course offerings.

See [data coverage](docs/DATA_COVERAGE.md), [architecture](docs/ARCHITECTURE.md), [evaluation](docs/EVALUATION_REPORT.md), and the [Build Week requirements register](docs/HACKATHON_REQUIREMENTS.md).

## Deployment

Deploy with Vercel using the repository defaults. Leave `OPENAI_API_KEY` unset for a seeded-only deployment, or add it as an encrypted server-side Vercel environment variable to enable live mode. Do not prefix it with `NEXT_PUBLIC_`.

## License

[MIT](LICENSE)
