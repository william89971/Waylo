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

## Multi-target articulation tables

- `institutions`: unit system, IGETC recognition, ingestion tier (`1|2`).
- `catalog_courses`: COC nodes in semester units only, optional lecture/lab pairing.
- `target_majors`: institution × major with coverage tier and constraint notes.
- `course_prerequisites`: COC DAG edges scoped to a release.
- `articulation_rules`: `destination_requirement_key` + JSONB `fulfillment_expression` (no flat `origin_course_id`), `verification_tier`, source metadata.
- `ingestion_runs` / `ingestion_raw_payloads`: Tier-1 ingest audit trail.
- `academic_data_releases`: `draft|active|retired` plus algorithm compatibility.
- `transfer_goals`: `primary_target_id`, `secondary_target_ids` (max 3), `include_secondary_divergence`.
- `plans`: `schedule` (COC semester) vs `audit_summary` (target-converted), plus evidence snapshot and divergence points.

`ArticulationExpression` = `COURSE` | `AND` | `OR` | `SERIES_COMPLETE`.  
`CourseBucket` = `core_overlap` | `primary_mandate` | `secondary_divergence`.  
Legacy evidence statuses map into `VerificationTier` for backward compatibility.

## Student and workspace types

- `StudentCourse`: normalized course, grade, term, completion state, extraction confidence, review state.
- `StudentProfile`: origin institution, completed/planned courses, targets, maximum units, summer preference.
- `EvidenceReviewResolution`: a student-reported counselor confirmation that may satisfy planning coverage while preserving the underlying evidence status.
- `AcademicTwin`: current validated route, normalized planning constraints, deterministic candidate outcomes, advisory weekly workload, evidence/review counts, and proposed or repaired alternatives.
- `WayloWorkspaceV3`: schema version, profile, selected pathway, confirmed simulation, review resolutions, sanitized operational trace, mode, and Academic Twin state. V1 and V2 workspaces migrate to V3.

Raw transcript bytes/text, prompts, API responses, and secrets are deliberately excluded.

## Planning types

- `RouteCandidate`: strategy, terms, milestones, completion estimate, coverage, score components, evidence, warnings.
- `TermPlan`: term identifier, course placements, units, milestone, validation state.
- `ValidationIssue`: severity, code, message, affected courses/requirements, evidence, suggested next action.
- `PlanResult`: valid routes, rejected candidates, unresolved requirements, review items, coverage summary.
- `PlanChange`: bounded remove/defer/move-course, summer-enrollment, transfer-target, weekly-work-hours, or maximum-unit instruction.
- `PlanCommandInterpretation`: normalized changes, confidence, clarification items, and live/seeded provenance.
- `SimulationDelta`: baseline/simulated IDs, term difference, course moves, target satisfaction, validity, acknowledgment gate, changed requirements, and blocker differences.
- `OperationalTraceEvent`: sanitized source, extraction, matching, review, planning, validation, repair, or route event with evidence IDs and safe counts.
- `TranscriptIngestionEvent`: NDJSON progress, structured result, or safe error event for the Evidence-to-Plan flow.
- `CandidateOutcome`: retained/rejected/repaired candidate status, strategy, validation issues, target fit, workload metrics, evidence counts, and repair provenance.
- `AdvisorDecisionPacket`: printable verified facts, counselor-confirmed facts, unresolved items, constraints, route tradeoffs, and decision questions.
- `JudgeModeSnapshot`: sanitized bounded coverage, model/mode, candidate counts, validation rules, evidence health, architecture stages, latency, and build-verification freshness.
- `RequirementVersion` and `RequirementChangeComparison`: controlled before/after requirement facts, explicit fixture status, and proposed affected route segments.

All schemas are Zod-validated. Future persistence migrations must be pure, tested, and preserve normalized state or reset safely with an explanation.
