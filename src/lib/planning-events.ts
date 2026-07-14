import type { PlanResult, PlanningEvent } from "@/lib/domain";

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
