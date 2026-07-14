# Waylo Architecture

## Principles

- Deterministic academic validation owns correctness.
- Model output is a typed proposal, extraction, or explanation—not a source of truth.
- Every academic claim is connected to evidence and verification status.
- Seeded mode is a first-class product path, not a broken live-mode substitute.
- Sensitive uploads are processed ephemerally and never persisted by default.

## Runtime structure

Waylo uses Next.js App Router with server route handlers and a client-side workspace. The client stores only normalized `WayloWorkspaceV1` state in IndexedDB. Raw uploads and model payloads are not written to IndexedDB or production logs.

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

## Core boundaries

- `AcademicDataRepository`: validated institutions, programs, courses, requirements, known offerings, articulations, and evidence.
- `PlanningEngine`: completed coverage, remaining groups, prerequisite graph, bounded candidate creation, scheduling, and strategy ranking.
- `RouteValidator`: duplicate credit, missing prerequisite, invalid ordering, grades, units, coverage, evidence, and unsupported-data checks.
- `SimulationEngine`: pure baseline-to-scenario transformations and structured deltas.
- `EvidenceRepository`: source lookup and pathway coverage reporting.
- `AcademicAIProvider`: structured extraction, explanation, and bounded repair proposal.
- `WorkspaceRepository`: `WayloWorkspaceV1` persistence, migration, reset, and seeded initialization.

## Planning algorithm

1. Validate the student profile and selected pathway.
2. Match completed courses only through verified equivalencies or explicit direct identifiers.
3. Mark uncertain matches for review without awarding requirement coverage.
4. Normalize remaining `all`, `any`, `choose`, unit, and minimum-grade requirement groups.
5. Build a directed prerequisite graph and reject cycles.
6. Generate bounded candidate course sets from verified alternatives.
7. Topologically schedule courses under term, unit, summer, and known-offering constraints.
8. Validate candidates and retain structured failures.
9. Rank valid candidates for fastest completion, greatest overlap, and balanced workload.
10. Return routes, tradeoffs, evidence, unresolved assumptions, and rejected-candidate summaries.

The bounded search does not claim mathematical optimality.

## API contracts

- `GET /api/health` -> `{ status, aiConfigured, model, demoMode }`; never returns secret values.
- `POST /api/transcripts/extract` -> normalized course candidates, confidence, source-page references, and review flags. Supported inputs are constrained by MIME type and size and are discarded after the request.
- `POST /api/planning-sessions` -> newline-delimited `PlanningEvent` records followed by a validated `PlanResult`.
- `POST /api/advisor-summary` -> structured printable summary derived from validated workspace data.

## GPT-5.6 Sol

The live provider uses the official OpenAI JavaScript SDK, Responses API, model `gpt-5.6-sol`, Zod-backed structured output, and strict tool schemas. Explanations use `medium`; complex extraction and repair use `high` by default. `xhigh` is not hard-coded until the pinned SDK type/schema and a user-authorized live smoke request both accept it. `max` is disabled for V1.

Transient requests retry twice with bounded backoff. A model proposal that fails deterministic validation may receive one repair attempt. A second failure is returned as unresolved. Seeded fixtures are labeled and revalidated on every use.

## Privacy and security

- `OPENAI_API_KEY` remains server-only.
- `.env.local` is ignored; `.env.example` contains no secret.
- Raw transcripts, prompts, and responses are excluded from logs and persistence.
- Upload type and size are validated before processing.
- UI copy never claims FERPA compliance.
- Reset deletes the local workspace.
