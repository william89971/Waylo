# Devpost Draft Copy

## Project name

Waylo — See what changes before you change your plan

## One-line description

An evidence-grounded academic decision simulator for community-college transfer students.

## Short description

Waylo turns transcripts, transfer requirements, and real-life constraints into validated academic routes students can review with a counselor. Instead of returning a plausible schedule, it shows the consequence of a change, retains rejected candidates for inspection, revalidates bounded repairs, carries evidence status into the route, and requires human confirmation before saving.

## Inspiration

Community-college transfer planning is full of dependency chains: moving one course can delay prerequisites, change a target term, or invalidate a route. Students often discover the consequence after enrollment decisions are already made. We wanted the “what changes?” question to become visible, reviewable, and grounded in evidence before a student commits.

## What it does

- Builds an Academic Twin from a seeded College of the Canyons profile, bounded transfer requirements, and real-life constraints.
- Simulates a change such as dropping Calculus I and shows the revised completion date and affected milestones.
- Searches bounded schedule candidates, retains deterministic rejections, attempts one allowlisted repair, and revalidates it from scratch.
- Separates verified evidence, partial evidence, and student-reported counselor confirmation.
- Turns the result into a printable Advisor Decision Packet with exact questions for a counselor.

## How GPT-5.6 is used

GPT-5.6 supports multimodal transcript extraction, unstructured-intent interpretation, ambiguity surfacing, and grounded explanation. Outputs cross a strict structured boundary. GPT-5.6 cannot create trusted course IDs, grant credit, waive prerequisites, validate schedules, or persist plan changes.

The public judging path is a complete seeded replay and labels recorded outputs exactly as `Recorded GPT-5.6 demo result.` It makes no OpenAI request and never ends in a missing-key error. The repository also contains the genuine protected server integration for authenticated live workflows.

## How Codex was used

Codex helped translate the human academic-safety boundary into the candidate-search, rejection, repair, and revalidation loop; build the typed Next.js implementation and tests; and browser-test the same consequence-to-counselor path judges use. A concrete collaboration example is documented in `docs/CODEX_USAGE.md`.

## How it works

Student request → GPT-5.6 structured interpretation → deterministic candidate search → prerequisite and requirement validation → human confirmation → evidence-backed route

## Challenges

The hardest problem was preventing a fluent model response from being mistaken for academic validity. Waylo treats model output as an untrusted proposal, validates every identifier and schedule in application code, preserves the last valid baseline, and exposes evidence gaps rather than smoothing them over.

## Accomplishments

- Six deeply supported College of the Canyons pathways across UC Berkeley, UCLA, and UC San Diego.
- Deterministic prerequisite, offering, unit, duplicate, requirement-coverage, and target validation.
- Consequence-first Academic Time Machine with rejected and repaired states.
- Evidence-to-Plan transcript review, counselor actions, Judge Mode, local persistence, accessibility checks, and print-ready handoff.
- 57 passing unit/contract/API tests plus desktop and mobile browser coverage.

## What is next

Waylo V1 stays deliberately narrow. The next step is human validation with students and counselors, followed by institution-specific data partnerships and policy review—not broadening into unsupported schools, majors, or automated advising claims.

## Required submission fields still pending

- Final public application URL
- Public video URL with narration
- Repository-access confirmation required by the rules
- Main Codex `/feedback` session ID
- Three-participant validation observations
