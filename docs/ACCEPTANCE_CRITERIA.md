# Waylo Acceptance Criteria

## Core product

- The app loads into a polished seeded experience without login or API key.
- All navigation destinations contain meaningful functionality on desktop and mobile.
- Profile review includes an uncertain Calculus I match that does not silently earn credit.
- Six College of the Canyons university-program pathways display official names and evidence metadata.
- A selected pathway yields three distinct valid route strategies with assumptions and tradeoffs.
- An intentionally invalid candidate is rejected for prerequisite order and shown in the planning trace.
- Removing Calculus I deterministically breaks or delays the applicable Data Science sequence; the timeline comes from data and engine behavior, not scripted UI copy.
- Switching to Cognitive Science recalculates overlap, requirements, warnings, and completion.
- Evidence is reachable from requirements, courses, warnings, and advisor summary.
- Advisor summary prints cleanly and separates verified facts from review questions.

## GPT and fallback

- Live requests use `gpt-5.6-sol`, strict typed output, and server-only credentials.
- Complex extraction and repair default to `high` reasoning.
- `xhigh` remains disabled until pinned SDK schema and live smoke request accept it.
- Missing-key/model-failure states offer clearly labeled seeded mode.
- Seeded/recorded results are never labeled live.
- Final video contains a verified live run unless API availability prevents it; any recorded run is explicitly labeled.

## Quality and release

- Typecheck, lint, unit, integration, seeded E2E, accessibility, and production build pass.
- No known prerequisite violation appears in a displayed validated route.
- No fabricated URL or unsupported university claim.
- No uncertain equivalency silently satisfies a requirement.
- No raw transcript/secret appears in persistence, client bundle, logs, fixtures, or screenshots.
- Browser QA covers desktop/mobile, console health, primary interaction, print output, and concept fidelity.
- Public repository is MIT licensed and public Vercel demo supports seeded mode.
- Product freezes July 18, 2026 at 5:00 PM PT; submission is due July 21, 2026 at 5:00 PM PT.
