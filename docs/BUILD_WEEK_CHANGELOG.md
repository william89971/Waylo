# Build Week Changelog

## 2026-07-13 — Foundation and complete seeded product

- Renamed and standardized the product as Waylo — “Find your way through college.”
- Locked the Education-track scope, July 18 product freeze, and July 21 submission deadline.
- Added Next.js App Router, strict TypeScript, Tailwind, shadcn/ui, Zod, Zustand, IndexedDB, Vitest, React Testing Library, Playwright, axe, and print styles.
- Added the six-pathway bounded academic dataset, source metadata, and explicit ASSIST/counselor-review states.
- Implemented route generation, prerequisite and grade checks, validation, three strategies, simulations, and local workspace migration.
- Added the `gpt-5.6-sol` Responses API provider, strict read-only tools, structured schemas, missing-key behavior, and labeled seeded fixtures.
- Built landing, onboarding, overview, profile, pathways, roadmap, compare, what-if, planning-session, evidence, evidence-detail, and advisor-summary experiences.
- Fixed browser-QA findings in route selectors, navigation, top-bar layout, and semantic color contrast.
- Passed typecheck, lint, 23 unit/contract/API tests, production build, and the seeded desktop/mobile browser suite.
- Created the Vercel project and completed its remote build at `https://waylo-phi.vercel.app`; the final incognito link check remains a user release step.
- Verified a clean source archive with `npm ci`, typecheck, lint, 23 tests, and a production build; exact Git clone verification follows branch publication.

## Remaining release actions

- User adds the local and Vercel `OPENAI_API_KEY`; verify the live workflow without exposing it.
- Complete the post-publication Git clone and logged-out deployment verification.
- Recheck official Build Week requirements, record the final demo, verify all public links, and submit.
