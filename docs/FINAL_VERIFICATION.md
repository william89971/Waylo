# Final Verification Report

Last updated: 2026-07-16

## Automated verification

| Check | Result |
| --- | --- |
| Strict TypeScript | Pass |
| ESLint | Pass with zero warnings |
| Vitest unit, contract, and API tests | 57/57 pass |
| Next.js production build | Pass; 23 pages/routes generated or compiled |
| Protected Preview Playwright | 11 executed tests passed; 7 intentional cross-project skips |
| Viewports | 1440x900 desktop and 390x844 mobile |
| Route coverage | Landing, demo, onboarding, all workspace routes, evidence detail, Academic Twin, and Judge Mode |
| axe serious/critical issues | 0 across every public/workspace route in desktop and mobile projects |
| Reduced motion | Pass |
| Print output | Pass |
| Raw upload/command persistence check | Pass; only normalized confirmed workspace data persists |
| Live GPT request | Pending user-supplied key |
| Exact public Git clone | Deferred while the repository remains private at the user's request |
| Deployment of this revision | Pass; private seeded Preview at [waylo-141cokmj1-williampuppet-4258s-projects.vercel.app](https://waylo-141cokmj1-williampuppet-4258s-projects.vercel.app) |

## Protected seeded Preview verification

- Deployment state: Ready, Preview target only, protected by Vercel authentication.
- Source branch: `codex/waylo-build-week`.
- Deployed commit: `b73d8cc802017009de68ab5c58c19dac1749264c`.
- Preview configuration: branch-scoped `WAYLO_DEMO_MODE=seeded`; no OpenAI environment variable is present or required.
- Health response: `demoMode=seeded`, `seededMode=true`, and `aiConfigured=false`.
- Live command, transcript, and planning requests returned `503 live_mode_disabled`; the live advisor request returned `403 live_advisor_disabled`. Each response kept seeded fallback available.
- Runtime logs contained only request identifiers, endpoint, mode, outcome, category, and duration. Searches found no credential name or sample transcript text, and Vercel reported no runtime errors during verification.
- A fresh authenticated browser context completed the desktop and mobile suite at 1440x900 and 390x844 with no console errors, horizontal overflow, or serious/critical axe findings. Reduced motion, keyboard activation, IndexedDB reload persistence, and print output passed.

## Actual User Demo Test

Tested flow: Academic Twin roadmap -> bounded four-change command -> structured preview -> deterministic candidate search -> baseline/proposed/repaired Time Machine -> target-miss acknowledgment -> confirmation-only persistence -> exact evidence drawer -> editable counselor inquiry -> alternate-route check -> counselor-confirmed resolution -> transcript upload -> seven visible stages -> student review -> normalized workspace commit -> operational trace -> pathway overlap -> controlled requirement comparison -> Judge Mode -> printable advisor decision packet.

What worked:

- The primary command resolves to exactly four bounded changes: remove Linear Algebra from Spring 2028, allow one summer course, set 25 weekly work hours, and stay as close as possible to Fall 2028.
- The parser asks for clarification when a named course and term do not match the active route.
- No workspace route changes before confirmation, and a missed target requires explicit acknowledgment.
- Candidate rejection and repair are produced by the same deterministic validator used for displayed routes; the baseline remains protected.
- Weekly work hours change advisory workload guidance but never silently relax hard unit or prerequisite rules.
- Evidence actions cite exact records without declaring an unsettled equivalency verified. Counselor confirmation remains a distinct status through `WayloWorkspaceV3`.
- PDF/image onboarding visibly covers all seven stages, supports student edits and duplicate review, and excludes raw upload data from storage.
- The operational trace exposes safe source IDs, counts, validations, rejected candidates, repair, duration, and final routes without hidden reasoning.
- Judge Mode is session-only and displays bounded coverage, model/mode, outcome counts, validation rules, architecture stages, evidence status, and honest stale/missing build verification.
- The requirement detector is visibly labeled as a controlled fixture and produces only proposed review state.
- Desktop and mobile roadmap experiences use equivalent dependency information without horizontal page overflow.

What failed and was fixed:

- Primary shadcn button text inherited navy on Waylo blue; the semantic foreground cascade was corrected.
- The extraction progress bar lacked an accessible name; it now has a stable label.
- Scrollable roadmap regions were not keyboard-focusable; they now expose labeled focusable regions.
- A nested focusable SVG used an image role; the route canvas now uses a group role with accessible title and description.
- Route-label contrast and mobile trace layout failed early checks; tokens and responsive layout were corrected.
- Proposed and repaired contextual rails initially showed baseline constraints; they now show simulated constraints.
- SVG title/description composition produced a hydration warning; each is now rendered as a stable text node.

Remaining verification:

- Live GPT verification remains intentionally deferred until the user separately authorizes a protected live rehearsal and supplies credentials. Public live mode must remain disabled until the session ledger is backed by a durable shared atomic store.
- Keep `xhigh` disabled unless a future live request accepts it; otherwise remain on `high`.
- Exact public-clone and anonymous public-link verification remain deferred until the user authorizes repository and demo publication.

Current readiness: the seeded product is implementation-complete and verified locally and on a private Vercel Preview. There are no release blockers for the protected seeded demo. Live GPT and public-release verification remain intentionally out of scope.
