# Codex Usage

Codex was the engineering and product-design collaborator for Waylo during OpenAI Build Week. The human set the product direction, academic-risk boundary, and release decisions; Codex helped turn those constraints into implementation, tests, browser evidence, and submission documentation.

## Concrete collaboration example: the model/validator boundary

The initial product direction needed natural-language planning without letting a model approve academic routes. The human requirement was: students should be able to describe a real-life change, but Waylo must never silently invent credit, waive a prerequisite, or overwrite a valid plan.

Codex helped express that boundary as a candidate loop:

1. GPT-5.6 produces a strict, bounded `PlanCommandInterpretation`.
2. Application code rejects identifiers outside the curated course, pathway, and destination sets.
3. The deterministic engine searches a capped candidate set.
4. Every candidate is checked for prerequisite order, known offerings, unit limits, duplicates, requirement coverage, and hard targets.
5. Invalid candidates remain inspectable; one allowlisted repair may run and must be revalidated from scratch.
6. A valid proposal still requires human confirmation before persistence.

Codex then wrote tests around the boundary and used the browser as a second “twin” of the implementation: it followed the same judge path a person would, found live-mode dead ends and mobile presentation defects that static checks could not reveal, and drove the UI and disclosure fixes.

## Other work completed with Codex

- Converted the product contract into a typed Next.js/TypeScript architecture.
- Implemented the Academic Twin, Time Machine, Evidence-to-Plan flow, evidence actions, Judge Mode, and Advisor Decision Packet.
- Added deterministic planning, simulation, persistence migration, privacy limits, server request limits, and protected live-workflow boundaries.
- Built unit, contract, API, browser, mobile, print, persistence, and accessibility checks.
- Performed the final judge-readiness pass: consequence-first tour, honest recorded/live labels, architecture-at-a-glance, and current submission documentation.

## What Codex did not decide

Codex did not validate official articulations, replace a counselor, supply credentials, authorize a live run, fabricate participant feedback, publish the final video, or submit the project. Those remain human responsibilities.

## GPT-5.6 versus deterministic code

GPT-5.6 is used for multimodal transcript extraction, unstructured-intent interpretation, ambiguity surfacing, and grounded explanation. Deterministic code controls course identity, prerequisite and requirement validation, schedule generation, consequences, route acceptance, and confirmation-gated persistence.

The public judge path is intentionally seeded and labels every recorded model-assisted result as `Recorded GPT-5.6 demo result.` It does not make an OpenAI request.
