# Waylo Build Plan

## Product outcome

Deliver a polished, no-login academic navigation product in which a College of the Canyons student can review a transcript-like profile, compare six university-program pathways, generate three validated route strategies, simulate a consequential course change, inspect evidence, and print an advisor-ready summary.

## Internal schedule

| Target | Completion gate |
| --- | --- |
| July 13 | Phase 0 documents, risk register, design inventory, app foundation |
| July 14 | Academic schemas, six-pathway evidence dataset, coverage tests |
| July 15 | Planning, validation, route scoring, and simulation engines |
| July 16 | GPT-5.6 provider boundary, APIs, event trace, seeded fallback |
| July 17 | Complete connected UX, accessibility, responsive and print passes |
| July 18 at 5:00 PM PT | Production build, full QA, deployment, documentation, freeze |
| July 18-21 | Demo rehearsal, live-model verification, video, submission review |

The submission deadline is **July 21, 2026 at 5:00 PM PT**. No weekday is attached to that date because published Build Week copy has contained a weekday inconsistency.

## Implementation sequence

1. **Foundation:** Next.js App Router, strict TypeScript, Tailwind, shared tokens, application shell, route layout, local persistence, seeded-mode banner, reusable feedback states.
2. **Academic truth layer:** Zod-validated institutions, programs, courses, requirement groups, articulations, evidence, confidence, and verification status.
3. **Deterministic engine:** requirement matching, prerequisite graph and cycle detection, term scheduling, unit constraints, candidate validation, three route strategies, structured failures.
4. **Simulation:** immutable baseline, remove/replace course changes, pathway switch, summer/unit controls, deterministic before/after delta, undo/reset/apply.
5. **GPT boundary:** `gpt-5.6-sol` Responses API, structured transcript extraction, strict tool contracts, event stream, one repair proposal, server-only secret handling, fixture fallback.
6. **Experience:** profile review, pathway comparison, roadmap, what-if, planning session, evidence detail, advisor summary, responsive navigation, print layout.
7. **Proof:** unit and integration tests, seeded Playwright path, accessibility checks, clean build, browser console check, visual fidelity ledger, final scorecard.

## Phase gates

Each phase requires relevant tests, TypeScript and lint checks, changelog and scorecard updates, and a meaningful Git checkpoint. A phase is not complete merely because files exist.

## Five greatest risks

1. **Academic-data overclaiming.** Mitigation: evidence metadata on every requirement, explicit `partial`/`uncertain`/`unavailable` states, no inferred articulation, visible counselor-review list.
2. **A visually plausible but invalid route.** Mitigation: GPT never validates routes; all candidates pass prerequisite, unit, sequencing, and coverage checks before display.
3. **Model or SDK mismatch.** Mitigation: pin the SDK, default complex work to `high`, typecheck reasoning enums, and enable `xhigh` only after schema plus live smoke verification.
4. **Demo fragility without an API key or during an outage.** Mitigation: complete seeded mode, validated recorded fixtures, explicit live/seeded labels, and no hidden automatic substitution.
5. **Breadth defeating polish before the freeze.** Mitigation: six-pathway scope lock, shared primitives, single seeded story, release freeze three days before submission, no unsupported features.

## Out of scope for V1

Authentication, server-side student storage, admissions prediction, a national institution catalog, official degree-audit status, automatic counselor messaging, dark mode, and claims of FERPA compliance.
