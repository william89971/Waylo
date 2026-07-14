# GPT and Deterministic-System Evaluation

Evaluation date: 2026-07-13

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
| `xhigh` SDK/schema check | Accepted by the installed TypeScript definitions |
| `xhigh` live request | Not run: user key is not present |
| `xhigh` enabled | No |
| `max` enabled | No |

## Offline contract evaluation

- Transcript and advisor-summary structured-output schemas parse the supported fixtures and reject malformed contracts.
- Tool inputs are strict and read only normalized pathway, validation, evidence, and simulation state.
- The missing-key route returns a safe categorized response and leaves seeded mode available.
- The health endpoint reports configured/not-configured state and never exposes configuration values.
- Recorded transcript fixtures are labeled `seeded`; generated route fixtures are produced by the current deterministic engine.

## Deterministic evaluation

The suite covers requirement matching, minimum-grade handling, uncertain-completion exclusion, prerequisite ordering, duplicate credit, unit limits, course scheduling, three distinct route layouts across all six pathways, Calculus I what-if deltas, workspace migration, GPT contracts, and API contracts.

Current verified run:

- TypeScript: pass
- ESLint: pass
- Vitest: 23/23 pass
- Production build: pass; 18 application/API routes compiled
- Playwright: 6 pass, 2 intentional cross-project skips
- axe: no serious or critical violations in the tested overview and advisor-summary pages on desktop and mobile

## Live verification protocol

After the user adds `OPENAI_API_KEY` to ignored `.env.local`:

1. Confirm `/api/health` reports `aiConfigured: true` without displaying any value.
2. Run a minimal `high` Responses API extraction and validate the parsed schema.
3. Run one planning-session explanation and confirm read-only tool calls complete.
4. Run one `xhigh` smoke request only after the SDK check remains green.
5. Keep `xhigh` disabled if the live API rejects it; record status, latency, and safe error category here.
6. Never place transcript/profile contents, prompts, responses, or the key in this report or logs.

Live latency, rate-limit behavior, and live `xhigh` acceptance remain unverified until the user supplies a key. The final video should show a verified live run; if availability makes that impossible, any recorded run must be explicitly labeled.
