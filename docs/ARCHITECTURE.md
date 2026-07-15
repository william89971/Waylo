# Waylo Architecture

## Principles

- Deterministic academic validation owns correctness.
- Model output is a typed proposal, extraction, or explanation—not a source of truth.
- Every academic claim is connected to evidence and verification status.
- Seeded mode is a first-class product path, not a broken live-mode substitute.
- Sensitive uploads are processed ephemerally and never persisted by default.

## Runtime structure

Waylo uses Next.js App Router with server route handlers and a client-side workspace. The client stores only normalized `WayloWorkspaceV3` state in IndexedDB. V1 and V2 records migrate without losing normalized profile/plan state. Raw commands, unconfirmed previews, uploads, drafts, and model payloads are not written to IndexedDB or production logs.

```text
UI routes
  -> WorkspaceRepository (normalized local state)
  -> PlanningEngine / SimulationEngine
       -> AcademicDataRepository
       -> EvidenceRepository
       -> RouteValidator
  -> server route handlers
       -> AcademicAIProvider (optional live GPT-5.6 Sol)
       -> deterministic tools and validator
```

The command lifecycle is deliberately review-gated:

```text
natural-language command
  -> PlanCommandInterpretation (live structured output or labeled seeded parser)
  -> bounded PlanChange preview
  -> deterministic SimulationEngine
  -> RouteValidator
  -> before/after review
  -> explicit confirmation
  -> normalized WayloWorkspaceV3 commit
```

## Core boundaries

- `AcademicDataRepository`: validated institutions, programs, courses, requirements, known offerings, articulations, and evidence.
- `PlanningEngine`: completed coverage, remaining groups, prerequisite graph, bounded candidate creation, scheduling, and strategy ranking.
- `RouteValidator`: duplicate credit, missing prerequisites, invalid ordering, units, known offerings, and unsupported-pathway checks. Completed-credit matching separately enforces grade and verification status.
- `SimulationEngine`: pure baseline-to-scenario transformations, target evaluation, course moves, and structured before/after deltas.
- `EvidenceRepository`: source lookup and pathway coverage reporting.
- `AcademicAIProvider`: structured extraction, explanation, and bounded repair proposal.
- `WorkspaceRepository`: `WayloWorkspaceV3` persistence, V1/V2 migration, reset, and seeded initialization.
- `AcademicTwin`: a normalized, validated view of the current route, constraints, candidate outcomes, and advisory weekly workload.
- `RouteCanvas`: dependency-node projections for the interactive desktop map and the equivalent mobile narrative.
- `RequirementChangeDetector`: compares explicit controlled versions and proposes affected segments for review; it does not scrape or claim a real source update.

## Planning algorithm

1. Validate the student profile and select one of the six covered pathways.
2. Count verified completed courses that meet the requirement's minimum grade. A separately recorded counselor-confirmed resolution may satisfy planning coverage, but it never changes the evidence status to verified.
3. Surface unresolved transcript matches as review items without silently awarding completed coverage.
4. Expand each pathway's explicit requirement-course list and recursively include prerequisites.
5. Search a bounded set of up to 24 internal schedule candidates across the seven-term horizon under unit, summer, prerequisite, and known-offering constraints.
6. Validate every candidate, retain informative rejected outcomes, and apply at most one allowlisted deterministic repair that is revalidated from scratch.
7. Rank valid candidates deterministically by validity, requested-target fit, strategy fit, evidence, workload variance, and stable ID into fastest, overlap, and balanced routes.
8. Retain the baseline route when a proposal fails, and return route tradeoffs, evidence, assumptions, review items, structured failures, and Time Machine states.

The bounded search does not claim mathematical optimality.

## API contracts

- `GET /api/health` -> `{ status, application, aiConfigured, demoMode, model, seededMode, xhigh }`; never returns configuration values.
- `POST /api/demo-sessions` -> a short-lived signed HttpOnly cookie for the single approved demo workflow. Seeded deployments reject issuance.
- `POST /api/plan-commands/parse` -> a Zod-validated `PlanCommandInterpretation` containing bounded changes, confidence, and clarification items.
- `POST /api/transcripts/extract` -> normalized course candidates, confidence, and review flags. NDJSON mode emits application-owned progress boundaries and ends with the structured result. Supported inputs are constrained by MIME type and size and are discarded after the request.
- `POST /api/planning-sessions` -> newline-delimited `OperationalTraceEvent` records derived from pathway and route IDs resolved against server-owned demo state.
- `POST /api/advisor-summary` -> deterministic printable packet derived from server-owned demo state; public live generation is disabled.
- `GET /api/judge-snapshot` -> sanitized coverage, evidence, outcome, architecture, latency, and build-manifest freshness data. Missing/stale verification is explicitly reported as not verified.
- `POST /api/requirement-changes/compare` -> a Zod-validated comparison of controlled requirement versions and proposed affected route segments.

## GPT-5.6 Sol

The live provider uses the official OpenAI JavaScript SDK, Responses API, model `gpt-5.6-sol`, Zod-backed structured output, and strict tool schemas. Explanations use `medium`; complex extraction and repair use `high` by default. `xhigh` is not hard-coded until the pinned SDK type/schema and a user-authorized live smoke request both accept it. `max` is disabled for V1.

The SDK retries at most once. Command, transcript, and planning outputs are capped at 3,000, 6,000, and 4,000 tokens respectively, and planning is limited to two Responses turns. Every creation consumes a six-creation signed-session budget, including continuations. Invalid structured output, quota rejection, timeout, budget rejection, or upstream failure immediately returns to a labeled seeded result. Model output never replaces deterministic validation. Seeded route displays are regenerated by the engine; recorded extraction fixtures are labeled and contract-tested.

## Privacy and security

- `OPENAI_API_KEY` remains server-only.
- `.env.local` is ignored; `.env.example` contains no secret.
- Raw transcripts, prompts, and responses are excluded from logs and persistence.
- Upload type and size are validated before processing.
- JSON bodies are bounded at 256 KB. Commands are bounded at 300 characters. Transcript text is bounded at 12,000 characters; one image or PDF is bounded at 2 MB, images at approximately four megapixels, and PDFs at two pages.
- `WAYLO_DEMO_MODE` defaults to seeded and is authoritative. Live endpoints require a signed 15-minute session, one active request at a time, endpoint workflow limits, and at most six Responses creations.
- Server logs contain only a random request ID, endpoint category, mode, outcome, error category, and duration.
- The current live-session ledger is process-local. Public live mode must remain disabled on a multi-instance deployment until a durable atomic quota store replaces it.
- UI copy never claims FERPA compliance.
- Reset deletes the local workspace.
- Judge Mode is session-only and never adds raw student data to its snapshot.
