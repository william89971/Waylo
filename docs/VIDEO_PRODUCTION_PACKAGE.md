# Build Week Video Production Package

Target: 2:15–2:45. Hard limit: under three minutes. Format: 16:9, narrated, no music, exact seeded revision.

## Final five-scene cut

| Scene | On-screen action | Narration |
| --- | --- | --- |
| Promise | Hold on the landing page and its full consequence panel. | Changing one course can move an entire transfer plan. Before I click anything, Waylo shows this seeded student's real consequence: Fall 2028 becomes Spring 2029, four milestones move, and the saved baseline stays protected. Waylo is an evidence-grounded academic decision simulator for community-college transfer students. |
| Consequence | Start the Judge Tour, select **Show me the consequence**, and hold on the result. | This is a seeded College of the Canyons student on a validated Data Science route. I'll ask Waylo what happens if Calculus I moves. The result is explicitly recorded, not live. GPT-5.6 interprets the request into a strict command. The consequence engine shows the new transfer term and every affected prerequisite milestone, without replacing the saved plan. |
| Validation | Open **Intelligence and validation**, show Judge Mode briefly, then close it. | Now Waylo separates interpretation from academic validity. Deterministic code searches a bounded set of candidates, rejects invalid schedules, attempts one allowlisted repair, and revalidates it from scratch. A model cannot invent a trusted course, grant credit, waive a prerequisite, or bypass confirmation. Judge Mode exposes the schema, candidate counts, rejection, repair, rules, evidence version, and safe architecture without exposing prompts, private data, or hidden reasoning. |
| Evidence | Open **Evidence and trust** and hold on the source status. | A schedule can be internally valid while an equivalency still needs verification. Waylo carries source status into the route and distinguishes verified evidence, partial evidence, and student-reported counselor confirmation. It shows exactly what is known, what is uncertain, and what should be checked before acting. |
| Handoff | Open **Counselor handoff**, hover the packet link, then open the packet. | The Advisor Decision Packet turns the simulation into a better counselor conversation. It separates route facts, unresolved evidence, constraints, alternatives, and exact questions. Codex helped translate the human safety boundary into the candidate-search and revalidation loop, then browser-tested this same judge path and caught presentation and live-mode risks before release. Waylo combines GPT-5.6 interpretation, deterministic academic validation, and human confirmation so students can see what changes before they change their plan. |

## Reproducible render

The Windows render pipeline is `scripts/render-build-week-demo.ps1`. It:

1. Generates one narration track per scene with the installed Windows voice.
2. Measures the real audio duration of every scene.
3. Records the exact product interactions at 1600×900.
4. Combines the browser recording and narration into an H.264/AAC MP4.
5. Creates an English SRT sidecar.
6. Fails if the final duration reaches three minutes.

The generated narration is a submission-ready draft. A personal voice recording may improve founder connection, but it must use the same factual script and timing.

Windows PowerShell:

```powershell
npm.cmd install --prefix .submission-video\tools ffmpeg-static@5.2.0 --no-save --package-lock=false
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\render-build-week-demo.ps1 `
  -OutputDirectory "C:\path\to\submission-assets" `
  -FfmpegPath ".\.submission-video\tools\node_modules\ffmpeg-static\ffmpeg.exe"
```

The ignored `.submission-video` directory contains only regenerated intermediates and tools. Final media should be written outside the repository or uploaded directly to the submission platform.

Verified render on 2026-07-17:

- Runtime: 2:30.90
- Video: 1600×900 H.264 High, 25 fps
- Audio: 48 kHz AAC, normalized to approximately -16 LUFS with -1.5 dB peak
- Captions: 19 sentence-timed English cues ending at 2:30.900
- Browser gate: the complete capture finished without console or page errors
- Output SHA-256: `794FFD6768A88FE147DA17CB1E76398B467A80534BF866D4088F362C0E36F526`

## YouTube metadata

**Title:** Waylo — See What Changes Before You Change Your Plan | OpenAI Build Week

**Description:**

Waylo is an evidence-grounded academic decision simulator for community-college transfer students.

This demo shows one Calculus I change moving a seeded transfer route from Fall 2028 to Spring 2029, affecting four milestones while preserving the saved baseline. GPT-5.6 interprets the request; deterministic code validates the academic route; a human confirms before persistence.

Built with Codex and GPT-5.6 for OpenAI Build Week. Waylo is a planning aid, not an official degree audit, admissions prediction, guarantee of transfer, or counselor replacement.

Repository: [PUBLIC_REPOSITORY_URL]
Demo: [PUBLIC_APP_URL]

## Upload quality gate

- Video is public and playable in a logged-out browser.
- Runtime is below 3:00; YouTube shows the complete duration.
- Audio clearly explains the product, Codex, and GPT-5.6.
- First 20 seconds show the exact consequence without relying on narration.
- No credentials, terminals, prompts, transcript contents, hidden reasoning, copyrighted music, or unrelated trademarks appear.
- Auto-captions are corrected or the generated SRT is uploaded.
- Description links resolve in a logged-out browser.
