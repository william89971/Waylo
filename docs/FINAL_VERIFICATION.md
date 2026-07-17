# Final Verification Report

Last updated: 2026-07-17

## Revision under review

- Branch: `codex/waylo-build-week`
- Target: Vercel Preview only
- Configuration: `WAYLO_DEMO_MODE=seeded`; no OpenAI key required
- Stable branch Preview: [waylo-git-codex-waylo-build-week-williampuppet-4258s-projects.vercel.app](https://waylo-git-codex-waylo-build-week-williampuppet-4258s-projects.vercel.app)

The verified application commit is `92c72701fa1a6c850a2803c71ecfa1b717e3b861`. Its unique Ready Preview URL and deployment ID are recorded in `PREVIEW_DEPLOYMENT.md`.

## Automated verification

| Check | Result |
| --- | --- |
| Strict TypeScript | Pass |
| ESLint | Pass with zero warnings |
| Vitest unit, contract, and API tests | 57/57 pass |
| Next.js production build | Pass; 24 pages/routes generated or compiled, including `/judge-tour` |
| Playwright desktop/mobile suite | 14 executed tests passed; 8 intentional cross-project skips |
| Viewports | 1440×900 desktop and 390×844 mobile |
| Route coverage | Landing, Judge Tour, demo, onboarding, every workspace route, evidence detail, Judge Mode, and health API |
| axe serious/critical issues | 0 across every public/workspace route in desktop and mobile projects |
| Console errors and horizontal overflow | 0 across the route matrix |
| Reduced motion | Pass |
| Print output | Pass |
| IndexedDB persistence and reload | Pass |
| Raw upload/command persistence check | Pass; only normalized confirmed workspace data persists |
| Seeded health contract | Pass: seeded mode on, demo mode seeded, AI not configured, no secret value returned |
| Credential pattern scan | Pass; no credential value or private-key material found |
| Human validation | Protocol ready; three participant sessions pending |

## Online Preview verification

- Vercel deployment `dpl_4PJGWG4rDPf8xxV6HLhhVr2WMDCt` reached Ready as a Preview for the exact application commit; Production remained unchanged.
- The deployed first viewport shows Fall 2028 → Spring 2029, four real engine-derived milestone moves, and the protected saved baseline before the first click.
- Desktop Judge Tour completed through consequence, Judge Mode, evidence review, counselor handoff, and Advisor Decision Packet.
- The deployed landing page was checked at 390×844 with no horizontal overflow; the exact-source mobile suite also covered the consequence and workspace flows.
- The exact-source browser suite verified that the full roadmap workflow rejects the invalid route, revalidates a bounded repair, requires explicit acknowledgment, saves the normalized route, and retains Spring 2029 after reload.
- The exact-source browser suite verified that Planning Session exposes `Replay GPT-5.6 demonstration`, labels the result recorded and seeded, and contains no judge-facing live action or API-key error.
- The deployed `/api/health` endpoint returned HTTP 200 with seeded mode on, AI not configured, and no secret value. Vercel recorded 49 HTTP 200, 13 HTTP 304, and 2 HTTP 204 responses with no 5xx responses during the verification window.

## Judge Tour verification

Tested flow:

Landing CTA → seeded College of the Canyons student → Academic Twin baseline → “I may have to drop Calculus I” → recorded GPT-5.6 structured interpretation → deterministic simulation → Fall 2028 to Spring 2029 → four moved milestones → candidate rejection → bounded repair and revalidation → Judge Mode → exact evidence status → counselor action → Advisor Decision Packet.

Verified product truths:

- The consequence appears before the technical architecture explanation.
- The recorded result uses the exact label `Recorded GPT-5.6 demo result.`
- The tour states `Seeded · no OpenAI request` and exposes no prominent missing-key action.
- GPT-5.6 is described as interpreting unstructured intent; deterministic code controls route validity.
- Invalid candidates remain inspectable and cannot replace the saved baseline.
- Human confirmation remains required before persistence.
- Evidence status and counselor-confirmed status remain separate.
- Judge Mode shows only sanitized technical facts and excludes prompts, transcript/profile contents, chain-of-thought, secrets, and raw model responses.
- The printable packet remains available outside the tour, as does the complete Waylo workspace.

## Browser-directed fixes made in this pass

- Moved the exact transfer-term consequence, all four affected courses, and baseline protection into the first viewport.
- Derived the landing proof from the seeded planning and simulation engines instead of duplicating display-only claims.
- Kept the primary judge-tour CTA visible above the fold on desktop and mobile.
- Confirmed no horizontal overflow at 390×844, no serious/critical axe findings, and no console errors across the route matrix.

## Remaining human work

- Complete the three participant sessions in `HUMAN_VALIDATION.md` without fabricating results.
- Record and publish the narrated video under three minutes.
- Add the final Codex `/feedback` session ID.
- Satisfy and verify private-repository reviewer access, or make the repository public.
- Recheck official Devpost requirements immediately before submission.
- Promote this same verified revision to Production only after the final Preview report; Production was not touched during this pass.
