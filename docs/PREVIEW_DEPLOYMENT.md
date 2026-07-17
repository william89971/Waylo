# Seeded Preview Deployment

Last updated: 2026-07-16

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
- [ ] Vercel reports the exact pushed commit Ready as a Preview.
- [ ] Unique deployment URL and deployment ID are recorded below.
- [ ] Online health response confirms seeded mode and no configured AI.
- [ ] Online landing CTA opens the four-stage Judge Tour.
- [ ] Online Calculus I flow shows Fall 2028 → Spring 2029 and four affected milestones.
- [ ] Online Judge Mode, evidence actions, Advisor Decision Packet, mobile layout, persistence, and print are verified.
- [ ] Online UI contains no judge-facing `Try live GPT-5.6` action or API-key error.

## Exact deployment record

- Commit: pending pushed revision
- Deployment ID: pending
- Unique Preview URL: pending
- State: pending
- Access: expected to use Vercel authentication; create a temporary share URL for logged-out verification if required

## Promotion decision

Do not promote to Production until every online checkbox above passes for the exact pushed revision. After that report, the revision is ready for a same-revision Production promotion; the promotion itself remains a separate user action.
