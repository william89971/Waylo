import type { OperationalTraceEvent, PlanResult, PlanningEvent } from "@/lib/domain";

const BASE_TIME = Date.parse("2026-07-13T18:00:00.000Z");

function timestamp(index: number) {
  return new Date(BASE_TIME + index * 420).toISOString();
}

export function createPlanningEvents(plan: PlanResult): PlanningEvent[] {
  const rejected = plan.candidateOutcomes.filter((outcome) => outcome.status === "rejected");
  const repaired = plan.candidateOutcomes.find((outcome) => outcome.status === "repaired");
  return [
    { id: "event-1", type: "source", label: "Read normalized student profile", detail: "Used confirmed course records without storing a transcript or prompt.", status: "complete" },
    { id: "event-2", type: "extraction", label: "Reviewed course matches", detail: `${plan.reviewItems.length} uncertain match${plan.reviewItems.length === 1 ? " remains" : "es remain"} for counselor review.`, status: plan.reviewItems.length ? "review" : "complete" },
    { id: "event-3", type: "source", label: "Loaded pathway evidence", detail: `Connected ${new Set(plan.routes.flatMap((route) => route.evidenceIds)).size} bounded source records.`, status: "complete" },
    { id: "event-4", type: "validation", label: "Evaluated bounded candidates", detail: `${plan.candidateOutcomes.length} retained outcomes include ${rejected.length} deterministic rejection${rejected.length === 1 ? "" : "s"}.`, status: rejected.length ? "rejected" : "complete" },
    ...(plan.repairAttempt ? [{ id: "event-5", type: "repair" as const, label: plan.repairAttempt.succeeded ? "Repaired and revalidated one candidate" : "Repair did not validate", detail: plan.repairAttempt.detail, status: "complete" as const }] : []),
    { id: "event-6", type: "route", label: `Generated ${plan.routes.length} validated routes`, detail: `Fastest, greatest-overlap, and balanced strategies are available${repaired ? "; one rejected route also passed a bounded repair" : ""}.`, status: "complete" },
    { id: "event-7", type: "warning", label: "Flagged counselor questions", detail: `${plan.reviewItems.length} evidence item${plan.reviewItems.length === 1 ? "" : "s"} need verification before enrollment decisions.`, status: "review" },
  ];
}

export function createOperationalTrace(plan: PlanResult): OperationalTraceEvent[] {
  const accepted = plan.candidateOutcomes.filter((outcome) => outcome.status === "accepted");
  const rejected = plan.candidateOutcomes.filter((outcome) => outcome.status === "rejected");
  const repaired = plan.candidateOutcomes.filter((outcome) => outcome.status === "repaired");
  const evidenceIds = Array.from(new Set(plan.routes.flatMap((route) => route.evidenceIds)));
  const events: OperationalTraceEvent[] = [
    { id: "trace-source", stage: "source", label: "Loaded bounded evidence", detail: `${evidenceIds.length} source IDs connected to the selected pathway.`, status: "complete", evidenceIds, count: evidenceIds.length, timestamp: timestamp(0), durationMs: 18, metadata: { sourceCount: evidenceIds.length } },
    { id: "trace-extraction", stage: "extraction", label: "Read normalized profile", detail: "Used confirmed records only; no upload, raw text, prompt, or model response was stored.", status: "complete", evidenceIds: [], count: 0, timestamp: timestamp(1), durationMs: 9 },
    { id: "trace-matching", stage: "matching", label: "Matched requirements", detail: `${plan.coverageSummary.completed} of ${plan.coverageSummary.total} requirement groups currently have supported completed coverage.`, status: plan.reviewItems.length ? "review" : "complete", evidenceIds, timestamp: timestamp(2), durationMs: 14 },
    { id: "trace-candidates", stage: "planning", label: "Generated bounded candidates", detail: `${plan.candidateOutcomes.length} informative outcomes were retained from a search capped at 24 internal candidates.`, status: "complete", evidenceIds: [], count: plan.candidateOutcomes.length, timestamp: timestamp(3), durationMs: 23, metadata: { cap: 24 } },
    ...rejected.map((outcome, index): OperationalTraceEvent => ({
      id: `trace-rejected-${outcome.id}`,
      stage: "validation",
      label: "Rejected candidate",
      detail: outcome.rejectionReasons.map((issue) => issue.message).join(" ") || "The candidate did not pass deterministic validation.",
      status: "rejected",
      evidenceIds: outcome.route.evidenceIds,
      count: outcome.rejectionReasons.length,
      timestamp: timestamp(4 + index),
      durationMs: 3,
      outcomeId: outcome.id,
      metadata: { strategy: outcome.strategy, rank: outcome.rank },
    })),
    ...(plan.repairAttempt ? [{
      id: "trace-repair",
      stage: "repair" as const,
      label: plan.repairAttempt.succeeded ? "Revalidated bounded repair" : "Repair failed validation",
      detail: `${plan.repairAttempt.action.replaceAll("_", " ")}. ${plan.repairAttempt.detail}`,
      status: plan.repairAttempt.succeeded ? "complete" as const : "rejected" as const,
      evidenceIds: [],
      count: 1,
      timestamp: timestamp(5 + rejected.length),
      durationMs: 7,
      outcomeId: plan.repairAttempt.outcomeId,
      metadata: { repaired: plan.repairAttempt.succeeded },
    }] : []),
    { id: "trace-validation", stage: "validation", label: "Validated final strategies", detail: `${accepted.length} strategy routes passed prerequisites, offerings, confirmed unit limits, duplicate-credit checks, and requirement coverage.`, status: "complete", evidenceIds: [], count: accepted.length, timestamp: timestamp(6 + rejected.length), durationMs: 11 },
    { id: "trace-route", stage: "route", label: "Published validated routes", detail: `Three strategy routes are ready for review. ${repaired.length ? "One repaired outcome is available in the Academic Time Machine." : "No repaired outcome was needed."}`, status: "complete", evidenceIds, count: accepted.length, timestamp: timestamp(7 + rejected.length), durationMs: 4 },
  ];
  return events;
}
