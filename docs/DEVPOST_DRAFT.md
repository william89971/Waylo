# Devpost Submission Copy

Updated: 2026-07-17. Copy is ready to paste except for the bracketed release values.

## Submission identity

- **Project:** Waylo — See what changes before you change your plan
- **Category:** Education
- **Tagline:** See downstream academic consequences before changing a transfer plan.
- **One-line description:** An evidence-grounded academic decision simulator for community-college transfer students.

## Short description

Changing one course can delay an entire transfer plan. Waylo shows the downstream term, prerequisite, evidence, and counselor-review consequences before a student replaces a valid baseline.

## Full description

Community-college transfer planning is a dependency problem disguised as a checklist. Moving one course can delay prerequisites, miss a target term, or create a route that looks plausible but is academically invalid. Students often discover those consequences after enrollment decisions are already made.

Waylo makes the “what changes?” question visible before a student commits.

The seeded judge scenario starts with a validated College of the Canyons Data Science route. When Calculus I moves, Waylo shows the transfer estimate changing from Fall 2028 to Spring 2029, identifies four affected milestones, and keeps the saved baseline protected.

The product then exposes why the answer is trustworthy:

- GPT-5.6 interprets an unstructured student request into a strict, bounded command.
- Deterministic code searches a capped candidate set and validates prerequisite order, known offerings, unit limits, duplicates, requirement coverage, and target constraints.
- Invalid candidates remain inspectable.
- One allowlisted repair may run, but it must be revalidated from scratch.
- Evidence status stays attached to the route.
- Human confirmation is required before persistence.

Waylo deliberately separates three questions that ordinary planning chatbots blur together: Is the request understood? Is the schedule internally valid? Is the underlying articulation sufficiently verified to act on? A valid schedule can still contain an equivalency that needs ASSIST or counselor review.

The final Advisor Decision Packet turns the simulation into a better human conversation. It separates route facts, unresolved evidence, constraints, alternatives, and exact questions for a counselor.

Waylo V1 is intentionally narrow: six College of the Canyons pathways across UC Berkeley, UCLA, and UC San Diego. It is a planning aid—not an official degree audit, admissions prediction, guarantee of transfer, or counselor replacement.

## How GPT-5.6 is used

GPT-5.6 supports multimodal transcript extraction, unstructured-intent interpretation, ambiguity surfacing, and grounded explanation. Every output crosses a strict structured boundary. GPT-5.6 cannot create trusted course IDs, grant credit, waive prerequisites, validate schedules, or persist plan changes.

The public judge path is a complete seeded replay and labels recorded output exactly as `Recorded GPT-5.6 demo result.` It makes no OpenAI request and cannot end in a missing-key error. The repository also contains the protected server integration for explicitly authorized live workflows.

## How Codex was used

The human defined the product thesis, academic-risk boundary, and release decisions. Codex translated that boundary into the typed candidate-search, rejection, repair, revalidation, and confirmation loop; implemented the product and tests; and browser-tested the same consequence-to-counselor path judges use.

One concrete collaboration moment changed the product: browser inspection showed that the strongest proof was hidden behind the first interaction. Codex rebuilt the first viewport around actual simulation-engine output—Fall 2028 to Spring 2029, four moved milestones, and the protected baseline—then added desktop and mobile regression coverage.

## Technical architecture

Student request → GPT-5.6 structured interpretation → deterministic candidate search → prerequisite and requirement validation → evidence review → human confirmation → normalized saved route

The app is a typed Next.js and TypeScript implementation with strict Zod contracts, deterministic academic engines, bounded live-mode security, IndexedDB persistence that excludes raw sensitive payloads, sanitized Judge Mode, and a print-ready advisor handoff.

## Challenges

The hardest problem was preventing a fluent model response from being mistaken for academic validity. Waylo treats model output as an untrusted proposal, rejects identifiers outside curated sets, preserves the last valid baseline, and exposes evidence gaps instead of smoothing them over.

The second challenge was presentation: a judge should understand the consequence before hearing the architecture. The final experience leads with the exact outcome, then earns trust through validation, evidence, and handoff.

## Accomplishments

- Six deeply supported pathways across three destinations.
- A consequence-complete first viewport and four-stage, two-minute Judge Tour.
- Deterministic prerequisite, offering, unit, duplicate, requirement, and target validation.
- Retained rejected candidates and one bounded, fully revalidated repair.
- Evidence-to-Plan transcript review, evidence actions, Judge Mode, and Advisor Decision Packet.
- 57 passing unit, contract, and API tests.
- 14 passing desktop/mobile browser checks with zero serious or critical axe findings, console errors, or horizontal overflow across the route matrix.
- A seeded, no-key judge path and a separate protected live-workflow implementation.

## Potential impact

Waylo targets a specific, high-stakes moment: a community-college student considering a plan change whose downstream effects are hard to see. The product does not automate the final decision. It gives the student and counselor a shared, inspectable object for discussing consequences, uncertainty, and alternatives.

## What is next

The next step is real student and counselor validation, followed by institution-specific data partnerships and policy review. V1 should not broaden into unsupported schools, majors, or automated advising claims until those foundations exist.

## Judge testing instructions

1. Open **[PUBLIC_APP_URL]** in a logged-out browser.
2. Confirm the first screen shows Fall 2028 → Spring 2029, four moved milestones, and a protected saved baseline.
3. Select **Start the 2-minute judge tour**.
4. Follow consequence, intelligence and validation, evidence and trust, and counselor handoff.
5. Open Judge Mode and the printable Advisor Decision Packet.

No account, API key, access code, transcript, or personal information is required.

## Submission fields to fill

| Field | Final value |
| --- | --- |
| Application | [PUBLIC_APP_URL] |
| Repository | [PUBLIC_REPOSITORY_OR_SHARED_PRIVATE_URL] |
| Video | [PUBLIC_YOUTUBE_URL] |
| Codex session | [MAIN_CODEX_FEEDBACK_SESSION_ID] |
| License | MIT |

## Claims guardrail

Use “planning aid,” “recorded GPT-5.6 demo result,” “seeded route,” “deterministic validation,” and “counselor review.” Do not claim an official degree audit, guaranteed transfer, admissions prediction, verified articulation where evidence is partial, or a live model request in the public judge path.
