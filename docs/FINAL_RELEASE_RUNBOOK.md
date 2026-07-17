# Final Build Week Release Runbook

Execute in order. Stop on any failed gate; do not compensate with an unverified claim.

## 1. Freeze the judged revision

- [ ] Confirm the intended branch and commit with `git status --short --branch` and `git rev-parse HEAD`.
- [ ] Confirm the remote branch and draft PR head equal the local commit.
- [ ] Confirm the exact Vercel deployment is READY and Preview-only.
- [ ] Confirm `/api/health` reports `demoMode=seeded`, `seededMode=true`, and `aiConfigured=false`.
- [ ] Keep Production unchanged until access and submission fields are ready.

## 2. Provide durable judge access

Choose one route and verify it logged out:

- [ ] Remove Vercel Authentication from the submitted deployment and confirm the final URL needs no account, token, or cookie; or
- [ ] Keep the site private and place durable testing credentials in the Devpost testing instructions.

A temporary `_vercel_share` URL is not acceptable because it expires before judging ends.

## 3. Provide repository access

Choose one route:

- [ ] Keep the repository private and share it with `testing@devpost.com` and `build-week-event@openai.com`; or
- [ ] Make the repository public with the existing MIT license.

Then verify the submitted repository URL exposes the exact judged revision. A draft PR alone is not a testing instruction.

## 4. Complete honest participant validation

- [ ] Run all three sessions in `HUMAN_VALIDATION.md`.
- [ ] Record only direct observations.
- [ ] Apply only observed release-blocking corrections.
- [ ] Rerun the complete product gate after any code change.

## 5. Produce and publish the video

- [ ] Review the generated MP4 and captions from the reproducible video pipeline.
- [ ] Replace the generated narration with a personal voice only if desired; preserve the factual script.
- [ ] Upload to YouTube as Public.
- [ ] Confirm the video is under three minutes and plays logged out.
- [ ] Add the final app and repository links to the description.

## 6. Capture the Codex evidence

- [ ] Run `/feedback` in the main Waylo build task.
- [ ] Copy the returned session ID exactly.
- [ ] Do not substitute a Git commit, PR number, or unrelated Codex task ID.

## 7. Fill Devpost

- [ ] Select **Education**.
- [ ] Paste the approved copy from `DEVPOST_DRAFT.md`.
- [ ] Add the final public app URL.
- [ ] Add the repository URL and verify reviewer access.
- [ ] Add the public YouTube URL.
- [ ] Add the main Codex `/feedback` session ID.
- [ ] Add screenshots with factual alt text.

## 8. Logged-out audit

In a fresh browser profile:

- [ ] Open every submitted link.
- [ ] Complete the four-stage Judge Tour.
- [ ] Open Judge Mode and the Advisor Decision Packet.
- [ ] Confirm the repository is visible to the intended reviewer route.
- [ ] Play the video from start to finish with sound.
- [ ] Confirm no field contains a placeholder in square brackets.

## 9. Submit and preserve evidence

- [ ] Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-build-week-submission.ps1` with every final URL, the video, the FFmpeg path, the Codex session ID, and the required explicit visibility/access confirmations; require `BUILD WEEK SUBMISSION GATE: PASS`. This bypass applies only to that process and does not alter the machine policy.
- [ ] Submit before July 21, 2026 at 5:00 PM PDT.
- [ ] Save the Devpost confirmation.
- [ ] Record the submitted URLs and exact commit.
- [ ] Keep the app free and unrestricted through August 5, 2026 at 5:00 PM Pacific.
- [ ] Do not modify the judged submission after the deadline unless Devpost explicitly permits the correction.
