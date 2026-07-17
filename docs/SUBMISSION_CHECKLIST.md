# Submission Checklist

Submission deadline: July 21, 2026 at 5:00 PM PDT.

## Product and Preview

- [x] Landing page explains the decision-simulation product and audience without narration.
- [x] Landing page shows the actual Fall 2028 to Spring 2029 consequence and four moved milestones before the first click.
- [x] Primary CTA says `Start the 2-minute judge tour`.
- [x] Four-stage tour covers consequence, validation, evidence, and counselor handoff.
- [x] Calculus I demonstration moves Fall 2028 to Spring 2029 and exposes four affected milestones.
- [x] Public seeded controls say `Replay GPT-5.6 demonstration`; no prominent missing-key dead end remains.
- [x] Recorded results use the exact label `Recorded GPT-5.6 demo result.`
- [x] Judge Mode shows sanitized model/mode, schema, candidates, rejection, repair, rules, evidence, safe latency, architecture, and build status.
- [x] Typecheck, lint, 57 unit/contract/API tests, and production build pass on this revision.
- [x] Full Playwright desktop/mobile, axe, persistence, and print suite passes on this revision.
- [x] Exact application revision is deployed to Vercel Preview with `WAYLO_DEMO_MODE=seeded` and no OpenAI key.
- [x] Preview is verified through the full Judge Tour on desktop and mobile.
- [ ] Production is promoted from the verified revision only after the Preview report.
- [ ] Final application URL is available free of charge and without access restriction through the judging period; a temporary Vercel share token is not sufficient.

## Trust and repository

- [x] Academic scope stays limited to six pathways across three destinations.
- [x] Evidence status and counselor-confirmed status remain separate.
- [x] Raw uploads, raw commands, prompts, model responses, and secrets are excluded from workspace persistence.
- [x] Human validation protocol exists and contains no fabricated results.
- [ ] Three participant sessions are complete and recorded honestly in `HUMAN_VALIDATION.md`.
- [x] Secret scan and clean dependency install/build check pass for the verified application commit.
- [x] Dated Git history proves the entire repository was created after the submission period opened.
- [ ] Private repository is shared with the required reviewers, or made public, and access is verified.
- [ ] Default branch or submitted branch URL exposes the exact judged revision; the current Draft PR is not a substitute for judge instructions.

## Demo and Devpost

- [x] Under-three-minute script follows the four-stage judge flow.
- [x] Reproducible narrated demo renders at 2:30.90 with H.264 video, normalized AAC audio, sentence-timed captions, a thumbnail, and six submission screenshots.
- [x] Codex story includes one concrete boundary/candidate-loop/browser-testing example.
- [x] Devpost draft accurately separates GPT-5.6 interpretation from deterministic validation.
- [x] Recheck official Overview, FAQ, Rules, and updates; record the result in `HACKATHON_REQUIREMENTS.md`.
- [ ] Record and publish the narrated YouTube video; verify it plays logged out.
- [ ] Add the final public app URL, repository URL/access, video URL, and main Codex `/feedback` session ID.
- [ ] Verify every submission link in a logged-out browser.
- [ ] Submit before the deadline and save the confirmation.

After product freeze, allow only release blockers, factual corrections, and submission-document changes. Every code fix requires targeted tests and another production build.
