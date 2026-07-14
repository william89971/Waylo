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
- `WayloWorkspaceV1`: schema version, profile, selected pathway, baseline route, simulations, safe planning events, UI preferences.

Raw transcript bytes/text, prompts, API responses, and secrets are deliberately excluded.

## Planning types

- `RouteCandidate`: strategy, terms, milestones, completion estimate, coverage, score components, evidence, warnings.
- `TermPlan`: term identifier, course placements, units, milestone, validation state.
- `ValidationIssue`: severity, code, message, affected courses/requirements, evidence, suggested next action.
- `PlanResult`: valid routes, rejected candidates, unresolved requirements, review items, coverage summary.
- `SimulationDelta`: baseline/simulated IDs, term difference, changed requirements, new/resolved blockers, explanation facts.
- `PlanningEvent`: discriminated event union for source, extraction, tool, validation, repair, route, warning, and completion states.

All schemas are Zod-validated. Future persistence migrations must be pure, tested, and preserve normalized state or reset safely with an explanation.
