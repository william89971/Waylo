# GPT and Deterministic-System Evaluation

Evaluation date: 2026-07-14

## Current configuration

| Item | Result |
| --- | --- |
| OpenAI SDK | `openai@6.46.0` pinned in the lockfile |
| Model | Explicit `gpt-5.6-sol` |
| API | Responses API |
| Structured output | Zod-backed parsed response schemas |
| Tools | Four strict read-only Zod function tools |
| Default explanation effort | `medium` |
| Complex extraction effort | `high` |
| SDK retries | At most one |
| Output ceilings | Command 3,000; transcript 6,000; planning 4,000 tokens |
| Public demo mode | Seeded-only; zero provider calls |
| Live session | Signed, 15 minutes, approved workflow only |
| `xhigh` SDK/schema check | Accepted by the installed TypeScript definitions |
| `xhigh` live request | Not run: user key is not present |
| `xhigh` enabled | No |
| `max` enabled | No |

## Offline contract evaluation

- Transcript, command, advisor packet, Judge snapshot, and requirement-change schemas accept supported fixtures and reject malformed contracts.
- `zodTextFormat` construction succeeds eagerly for command, transcript, and advisor schemas before any network request.
- Tool inputs are strict and read only normalized pathway, validation, evidence, and simulation state.
- Seeded command, transcript, and planning routes make zero provider calls. Live requests are rejected unless server mode and a signed approved-workflow session are both valid.
- Timeout, quota, schema, budget, upstream, and missing-configuration failures return immediately to a labeled seeded result.
- The health endpoint reports seeded/live and configured/not-configured state without exposing configuration values.
- Contract tests cover 256 KB JSON, 300-character commands, 12,000-character transcript text, one bounded 2 MB image or two-page PDF, one concurrent request, six Responses creations, endpoint workflow limits, signed-cookie tampering, output ceilings, advisor protection, and log redaction.
- Recorded transcript and command results are explicitly labeled. Generated routes are revalidated by the current deterministic engine.
- Requirement-change detection uses an explicitly controlled fixture and never claims a real catalog, ASSIST, or university update.

## Deterministic evaluation

The planner searches a bounded set of up to 24 internal candidates, validates each candidate, retains informative rejected outcomes, applies at most one allowlisted repair, and revalidates that repair from scratch. Ranking is stable and deterministic across validity, requested-target fit, route strategy, evidence, workload variance, and stable candidate ID. Weekly work hours inform advisory workload only; maximum units, prerequisites, offerings, duplicate credit, completion grade, and requirement coverage remain hard validation rules.

The suite covers requirement matching, minimum-grade handling, uncertain-completion exclusion, prerequisite ordering, duplicate credit, unit limits, course scheduling, three distinct route layouts across all six pathways, command aliasing and ambiguity, advisory workload, target acknowledgments, Time Machine outcomes, Calculus I what-if deltas, V1/V2-to-V3 migration, counselor-confirmed coverage, controlled requirement comparison, GPT contracts, and API contracts.

Current verified run:

- TypeScript: pass
- ESLint: pass
- Vitest: 57/57 pass
- Production build: pass; 23 pages/routes generated or compiled
- Playwright: 11 executed tests passed, 7 intentional cross-project skips
- axe: no serious or critical violations across every public/workspace route in desktop and mobile projects

## Live verification protocol

After the user intentionally configures `OPENAI_API_KEY`, `WAYLO_DEMO_MODE=live`, an independent signing secret, and an independent access code in ignored `.env.local`:

1. Replace the process-local session ledger with a durable atomic expiring store before multi-instance live deployment, or constrain the rehearsal to one server process.
2. Issue one signed approved-workflow session and confirm `/api/health` reports `aiConfigured: true` without displaying any value.
3. Run a minimal `high` Responses API extraction and validate the parsed schema and output ceiling.
4. Run one planning-session explanation and confirm no more than two read-only tool turns complete.
5. Run one `xhigh` smoke request only after the SDK check remains green.
6. Keep `xhigh` disabled if the live API rejects it; record status, latency, and safe error category here.
7. Never place transcript/profile contents, prompts, responses, uploads, access codes, model output, or credentials in this report or logs.

Live latency, rate-limit behavior, and live `xhigh` acceptance remain unverified until the user supplies a key. The final video should show a verified live run; if availability makes that impossible, any recorded run must be explicitly labeled.
