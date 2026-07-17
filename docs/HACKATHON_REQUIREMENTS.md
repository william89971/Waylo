# OpenAI Build Week Requirements Register

Last checked: 2026-07-17 against the official OpenAI Build Week site and Devpost Overview, FAQ, Official Rules, and updates. Recheck immediately before submission because Devpost requirements can change.

## Current submission requirements

| Requirement | Waylo evidence | Status |
| --- | --- | --- |
| Submit by July 21, 2026 at 5:00 PM PDT | Date is repeated in the submission checklist | Confirmed |
| Meaningfully use Codex and GPT-5.6 | `CODEX_USAGE.md`, protected GPT-5.6 provider integration, strict outputs/tools, Judge Mode, recorded seeded demonstration | Implemented; final narration pending |
| Demo video under three minutes | `DEMO_SCRIPT.md` targets 2:20–2:40 | Recording pending |
| Public YouTube video with audio | Final URL must play logged out | Pending user action |
| Working application URL, available free of restriction through judging | Consequence-first seeded Judge Tour is verified on the exact branch Preview | Product verified; durable public access remains a release gate because Vercel Authentication is currently enabled |
| Repository access and MIT license | MIT license present; repository currently private | User must share private repository with `testing@devpost.com` and `build-week-event@openai.com`, or make it public, then verify access |
| README with setup, sample-data explanation, and Codex/GPT-5.6 details | Root README and linked technical docs | Implemented; final URL pending |
| Codex `/feedback` session ID | Add the main Build Week session ID to Devpost | Pending user action |
| New or meaningfully extended during the submission period | Entire repository was created after July 13, 2026 at 9:00 AM Pacific; initial commit `da20ac2` was authored at 5:52 PM Pacific | Confirmed by dated Git history |

## Judging criteria

Waylo is prepared around the four published criteria:

1. Technological implementation, including meaningful Codex use.
2. Design.
3. Potential impact.
4. Quality of the idea.

The evidence map and honest internal grade live in `JUDGING_SCORECARD.md`.

## Product truth for judges

- The public judging path is seeded, complete, and authoritative.
- Recorded model-assisted results use the exact label `Recorded GPT-5.6 demo result.`
- The seeded path makes no OpenAI request and never presents itself as live.
- GPT-5.6 handles multimodal extraction, unstructured-intent interpretation, ambiguity, and explanation.
- Deterministic code controls prerequisites, requirements, schedules, consequences, candidate acceptance, and persistence.
- Waylo is a planning aid, not an official degree audit, admissions predictor, or counselor replacement.

## Final recheck record

| Date/time | Pages checked | Change found | Impact and resolution |
| --- | --- | --- | --- |
| 2026-07-17 | OpenAI Build Week page; Devpost Overview, FAQ, Official Rules, and submission update | Official Rules explicitly require the working project to remain free of charge and without restriction through judging; criteria are equally weighted and technical implementation breaks ties | Added the durable public-access gate, explicit Git provenance, and judge testing instructions; no eligibility conflict found |
