# Waylo

Waylo helps College of the Canyons students answer one urgent question: **what
should I take next semester?**

Students create an account, confirm their academic history, choose a supported
transfer major, and receive an evidence-backed semester-by-semester plan showing
what remains and what needs ASSIST or counselor confirmation. The first reliable
end-to-end pathway is UC San Diego Data Science B.S. UC Berkeley and UCLA pathway
data remains intentionally limited until reviewed.

Waylo is a planning aid, not an official degree audit, articulation agreement,
admission prediction, or enrollment guarantee.

## Product boundary

- Clerk provides passwordless email and Google authentication.
- Neon Postgres stores normalized student records and immutable plan versions.
- The deterministic planner and validator decide whether a schedule is valid.
- Evidence status is explicit: Verified, Planning suggestion, or ASSIST/counselor
  confirmation needed.
- AI can interpret or explain. It cannot silently change a plan or verify an
  uncertain academic claim.
- Raw transcript uploads are never stored by default.

See [production architecture](docs/PRODUCTION_ARCHITECTURE.md), [academic data
coverage](docs/DATA_COVERAGE.md), and the [conversion baseline](docs/PHASE_1_BASELINE.md).

## Local setup

Requires Node.js 22 and npm.

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Configure Clerk and Neon in `.env.local`. For automated browser tests only, set
`WAYLO_TEST_AUTH=1`; that adapter is disabled in production.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## Database changes

Generate and inspect migrations locally, then apply them explicitly with the
unpooled Neon URL:

```bash
npm run db:generate
npm run db:migrate
```

Do not run application startup migrations and do not commit environment values.

## Deployment

1. Create isolated Clerk and Neon Preview resources.
2. Set every required variable from `.env.example` in Vercel Preview.
3. Run `npm run db:migrate` against the unpooled Preview database.
4. Deploy the tested commit with `vercel deploy`.
5. Run the desktop and 390×844 production journey against the returned URL.
6. Promote only after academic and privacy review; production uses a separate
   Neon branch/database and production Clerk instance.

## License

[MIT](LICENSE)
