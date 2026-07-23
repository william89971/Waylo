# Phase 1 Preview record

Status recorded on 2026-07-23.

## Tested release

- Git commit: `e0773e528fa0fa4265c12fb9f7b9b17e1ba73518`
- Preview branch: `codex/phase1-preview`
- Vercel deployment: `waylo-ha7hpoap4-williampuppet-4258s-projects.vercel.app`
- Stable branch alias: `waylo-git-codex-phase1-preview-williampuppet-4258s-projects.vercel.app`
- Vercel deployment ID: `dpl_A8qP9GePiZGGMaoFmiu68q6rev4g`
- Migration: `drizzle/0000_mixed_warbird.sql`

The same commit passed TypeScript, ESLint, all 57 unit tests, the production
build, and six focused browser cases covering desktop, 390-by-844 mobile,
accessibility, overflow, persistence, and cross-user isolation.

## Isolated Preview data

- Neon project: `waylo-phase-1` (`square-boat-66784810`)
- Preview branch: `vercel-preview` (`br-orange-recipe-a6h9u7zp`)
- Database: `neondb`

Migration `0000` was applied explicitly to the Preview branch. A schema query
confirmed all ten normalized tables. No raw transcript file or transcript text
is represented in the schema.

## External configuration gate

The deployed build intentionally fails closed until Clerk and Neon environment
values are attached in Vercel. Public landing and sanitized health surfaces
remain available; protected student routes do not use a local fallback in a
deployed environment.

Required before hosted browser verification:

- Create or connect the Clerk application.
- Enable passwordless email and Google sign-in.
- Add the Preview and production redirect URLs in Clerk.
- Add Clerk keys, pooled Preview database URL, unpooled Preview migration URL,
  application URL, and admin allowlist to the Vercel Preview environment.
- Redeploy the exact tested commit.

## Academic-data limitations

The current release is intentionally labeled
`ucsd-data-2026-review-needed`. It does not claim that an unreviewed COC-to-UCSD
course mapping is verified. The product separates verified facts, planning
suggestions, and items requiring ASSIST or counselor confirmation. Human
academic review and a current official articulation evidence set remain required
before the pathway may be described publicly as reviewed.
