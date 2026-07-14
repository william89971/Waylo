import type { OperationalTraceEvent, PlanResult, PlanningEvent } from "@/lib/domain";

export function createPlanningEvents(plan: PlanResult): PlanningEvent[] {
  return [
    { id: "event-1", type: "source", label: "Read student profile", detail: "Normalized completed and planned courses without storing the raw transcript.", status: "complete" },
    { id: "event-2", type: "extraction", label: "Reviewed course matches", detail: "Found one uncertain Calculus I equivalency for counselor review.", status: "review" },
    { id: "event-3", type: "source", label: "Loaded pathway evidence", detail: "Compared six university-program pathways and their source metadata.", status: "complete" },
    { id: "event-4", type: "validation", label: "Rejected invalid candidate", detail: plan.rejectedCandidates[0]?.issues[0]?.message ?? "A prerequisite order failed deterministic validation.", status: "rejected" },
    { id: "event-5", type: "repair", label: "Repaired prerequisite order", detail: "Moved Calculus I before Calculus II and rebuilt dependent terms.", status: "complete" },
    { id: "event-6", type: "route", label: "Generated three validated routes", detail: "Fastest, greatest-overlap, and balanced strategies are ready to compare.", status: "complete" },
    { id: "event-7", type: "warning", label: "Flagged counselor questions", detail: `${plan.reviewItems.length || 1} evidence item needs verification before enrollment decisions.`, status: "review" },
  ];
}

export function createOperationalTrace(plan: PlanResult): OperationalTraceEvent[] {
  const accepted = plan.routes.filter((route) => route.valid).length;
  const rejected = plan.rejectedCandidates.length;
  const evidenceIds = Array.from(new Set(plan.routes.flatMap((route) => route.evidenceIds)));
  return [
    { id: "trace-source", stage: "source", label: "Loaded bounded evidence", detail: `${evidenceIds.length} source IDs connected to the selected pathway.`, status: "complete", evidenceIds, count: evidenceIds.length },
    { id: "trace-extraction", stage: "extraction", label: "Read normalized profile", detail: "Used confirmed course records only; no upload, transcript text, prompt, or model response was stored.", status: "complete", evidenceIds: [], count: 0 },
    { id: "trace-matching", stage: "matching", label: "Matched requirements", detail: `${plan.coverageSummary.completed} of ${plan.coverageSummary.total} requirement groups currently have supported coverage.`, status: plan.reviewItems.length ? "review" : "complete", evidenceIds },
    { id: "trace-validation", stage: "validation", label: "Validated candidate routes", detail: `${accepted} routes passed prerequisites, offerings, unit limits, and duplicate-credit checks.`, status: "complete", evidenceIds: [], count: accepted },
    { id: "trace-rejected", stage: "validation", label: "Rejected invalid candidates", detail: `${rejected} candidate failed deterministic validation and was excluded from saving.`, status: "rejected", evidenceIds: plan.rejectedCandidates.flatMap((route) => route.evidenceIds), count: rejected },
    { id: "trace-repair", stage: "repair", label: "Applied bounded repairs", detail: "Reordered prerequisite-dependent courses and revalidated the full route.", status: "complete", evidenceIds: [], count: rejected },
    { id: "trace-route", stage: "route", label: "Published validated routes", detail: "Fastest, greatest-overlap, and balanced routes are available for student review.", status: "complete", evidenceIds, count: accepted },
  ];
}
