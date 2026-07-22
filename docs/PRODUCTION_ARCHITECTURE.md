# Waylo production architecture

Waylo remains a Next.js App Router application deployed on Vercel. Clerk owns
authentication. Neon Postgres is the durable system of record, accessed only by
server components and authenticated APIs through Drizzle ORM. Browser storage is
not authoritative.

The application stores normalized student profile data, confirmed COC courses,
transfer goals, planning preferences, immutable plan versions, and evidence
metadata. Every student read and write first resolves the Clerk identity to an
internal `users.id` and applies that owner ID to the query.

The planning engine and validator remain deterministic. They run on the server
against normalized, student-confirmed data. AI may later extract or explain a
draft, but it cannot save a course, alter a plan, change evidence state, or mark
an uncertain articulation verified.

## Database connections

- `DATABASE_URL`: pooled Neon connection for application traffic.
- `DATABASE_URL_UNPOOLED`: direct Neon connection used only by Drizzle migrations.

The initial migration creates `users`, `student_profiles`, `student_courses`,
`transfer_goals`, `planning_preferences`, `plans`, `plan_terms`, `plan_courses`,
`evidence_sources`, and `academic_data_releases`. Foreign keys cascade only from
the owning user or plan. Plans are append-only versions; saving a new version
atomically deactivates the previous active version.

## Transcript privacy boundary

Raw uploads are not part of the schema. The manual-entry Phase 1 journey stores
only confirmed normalized courses. When extraction is enabled, files must be
processed in request memory and discarded after returning a review draft unless
the student separately gives explicit retention consent. Unconfirmed drafts,
filenames, transcript text, prompts, and model responses must not be written to
Postgres, logs, analytics, Redis, or error reporting.
