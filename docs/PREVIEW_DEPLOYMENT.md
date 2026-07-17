# Private Preview Deployment

Last verified: 2026-07-16

## Deployment record

- Preview URL: [waylo-141cokmj1-williampuppet-4258s-projects.vercel.app](https://waylo-141cokmj1-williampuppet-4258s-projects.vercel.app)
- Vercel deployment: `dpl_Gg2Fwg9Hd7yuhg9k7vxk8BwSn8aL`
- Source branch: `codex/waylo-build-week`
- Source commit: `b73d8cc802017009de68ab5c58c19dac1749264c`
- Target: Preview only
- Access: private through Vercel authentication
- Repository visibility: private

## Seeded-only configuration

The branch-scoped Preview environment sets `WAYLO_DEMO_MODE=seeded`. No `OPENAI_API_KEY` is present or required. The deployed health endpoint reports seeded mode and `aiConfigured=false`.

Seeded mode is authoritative. Recorded extraction, command parsing, planning, and Judge Mode results are labeled `Recorded GPT-5.6 demo result.` Live requests are rejected before provider access and return a safe seeded-fallback signal.

## Verification results

- Deployment state: Ready.
- Exact deployment commit: verified through Vercel deployment metadata.
- Local TypeScript: pass.
- ESLint: pass with zero warnings after temporary browser artifacts were removed.
- Vitest: 57/57 pass.
- Next.js production build: pass; 23 pages/routes.
- Deployed Playwright: 11 pass and 7 intentional viewport skips.
- Desktop viewport: 1440x900 pass.
- Mobile viewport: 390x844 pass.
- Console errors: none.
- Horizontal overflow: none across public and workspace routes.
- axe serious/critical findings: none.
- Keyboard activation and focus handling: pass.
- Reduced motion: pass.
- Workspace persistence and reload: pass.
- Print output: pass.
- Runtime errors during verification: none.
- Credential or sample transcript text in runtime-log searches: none.

The deployed journey covered landing/demo entry, Evidence-to-Plan extraction and review, Academic Twin desktop and mobile routes, the seeded command parser, structured preview, deterministic simulation, candidate rejection, bounded repair, revalidation, Academic Time Machine, pathway comparison, evidence actions, counselor inquiry, Advisor Decision Packet, Judge Mode, controlled requirement-change demonstration, persistence, print, and missing-live-AI behavior.

## Remaining blockers

There are no release blockers for this private seeded Preview. The following items remain intentionally deferred:

- Live GPT-5.6 verification requires separate authorization and a user-supplied credential.
- Public live mode remains blocked until the process-local session ledger is replaced by durable shared atomic quota storage.
- Public repository, anonymous demo access, public-clone verification, and production deployment remain pending user approval.
