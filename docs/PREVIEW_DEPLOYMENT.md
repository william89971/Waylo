# Seeded Preview Deployment

Last updated: 2026-07-17

## Target

- Project: `waylo` (`prj_xzHW8n9JS3r10WSJTDQ1Yz8L0a5j`)
- Team: `williampuppet-4258s-projects`
- Source branch: `codex/waylo-build-week`
- Target: Preview only
- Stable branch alias: [waylo-git-codex-waylo-build-week-williampuppet-4258s-projects.vercel.app](https://waylo-git-codex-waylo-build-week-williampuppet-4258s-projects.vercel.app)
- Production: unchanged

## Required configuration

The branch-scoped Preview environment must keep `WAYLO_DEMO_MODE=seeded`. No `OPENAI_API_KEY` is present or required for the judging path. A successful health check must report:

- `demoMode=seeded`
- `seededMode=true`
- `aiConfigured=false`
- `model=gpt-5.6-sol`

## Verification checklist

- [x] Local typecheck, lint, 57 tests, and production build pass.
- [x] Local desktop/mobile Playwright suite passes with zero serious/critical axe findings.
- [x] Local Judge Tour completes from consequence through counselor handoff.
- [x] Vercel reports the exact pushed commit Ready as a Preview.
- [x] Unique deployment URL and deployment ID are recorded below.
- [x] `/api/health` returns HTTP 200 on the exact Preview; the same-revision contract test confirms seeded mode and no configured AI.
- [x] Online landing CTA opens the four-stage Judge Tour.
- [x] Online Calculus I flow shows Fall 2028 → Spring 2029 and four affected milestones.
- [x] Online Judge Mode, evidence actions, Advisor Decision Packet, mobile layout, persistence, and print are verified.
- [x] Online UI contains no judge-facing `Try live GPT-5.6` action or API-key error.

## Exact deployment record

- Application commit: `92c72701fa1a6c850a2803c71ecfa1b717e3b861`
- Deployment ID: `dpl_4PJGWG4rDPf8xxV6HLhhVr2WMDCt`
- Unique Preview URL: [waylo-qwycx9v0a-williampuppet-4258s-projects.vercel.app](https://waylo-qwycx9v0a-williampuppet-4258s-projects.vercel.app)
- State: Ready (Preview; Production unchanged)
- Access: Vercel Authentication is enabled. Temporary authenticated share links were used for logged-out desktop and mobile verification and were not recorded in the repository.

The online pass covered the consequence-complete landing page, the complete Judge Tour, the sanitized Judge Mode trace, exact evidence statuses, counselor handoff, Advisor Decision Packet availability, and the 390×844 mobile layout. The exact deployed `/api/health` endpoint returned HTTP 200 with the seeded contract. Vercel runtime evidence showed 49 HTTP 200, 13 HTTP 304, and 2 HTTP 204 responses overall, with no 5xx responses during verification.

## Promotion decision

Do not promote to Production until every online checkbox above passes for the exact pushed revision. After that report, the revision is ready for a same-revision Production promotion; the promotion itself remains a separate user action.
