# Waylo Data Model

## Evidence

Every academic record contains an `EvidenceReference` with a stable ID, institution/pathway, source title and URL, effective academic year, retrieval date, provenance, verification state, and a note describing exactly what the source supports.

Provenance is `official`, `assist`, `human_curated_demo`, or `ai_extracted`. Verification is `verified`, `partial`, `uncertain`, or `unavailable`. Only verified equivalencies automatically satisfy requirements; every other state produces a review item.

## Academic types

- `Institution`: origin/destination identity, term system, official URL.
- `Program`: university, official degree name, degree type, pathway family, evidence references.
- `Course`: institution code, title, units, prerequisites, known terms, minimum grade, evidence.
- `CourseEquivalency`: origin course, destination course or requirement, verification status, evidence.
- `RequirementGroup`: `all`, `any`, `choose`, or `units` rule with minimum grade and alternatives.
- `PrerequisiteExpression`: recursive `course`, `all`, or `any` expression.

## Student and workspace types

- `StudentCourse`: normalized course, grade, term, completion state, extraction confidence, review state.
- `StudentProfile`: origin institution, completed/planned courses, targets, maximum units, summer preference.
- `EvidenceReviewResolution`: a student-reported counselor confirmation that may satisfy planning coverage while preserving the underlying evidence status.
- `WayloWorkspaceV2`: schema version, profile, selected pathway, confirmed simulation, review resolutions, sanitized operational trace, and mode. V1 workspaces migrate to V2.

Raw transcript bytes/text, prompts, API responses, and secrets are deliberately excluded.

## Planning types

- `RouteCandidate`: strategy, terms, milestones, completion estimate, coverage, score components, evidence, warnings.
- `TermPlan`: term identifier, course placements, units, milestone, validation state.
- `ValidationIssue`: severity, code, message, affected courses/requirements, evidence, suggested next action.
- `PlanResult`: valid routes, rejected candidates, unresolved requirements, review items, coverage summary.
- `PlanChange`: bounded defer-course, summer-enrollment, or transfer-target instruction.
- `PlanCommandInterpretation`: normalized changes, confidence, clarification items, and live/seeded provenance.
- `SimulationDelta`: baseline/simulated IDs, term difference, course moves, target satisfaction, validity, acknowledgment gate, changed requirements, and blocker differences.
- `OperationalTraceEvent`: sanitized source, extraction, matching, review, planning, validation, repair, or route event with evidence IDs and safe counts.
- `TranscriptIngestionEvent`: NDJSON progress, structured result, or safe error event for the Evidence-to-Plan flow.

All schemas are Zod-validated. Future persistence migrations must be pure, tested, and preserve normalized state or reset safely with an explanation.
