import { zodResponsesFunction } from "openai/helpers/zod";
import { z } from "zod";
import { evidenceById, programById } from "@/lib/academic-data";
import { simulationEngine } from "@/lib/simulation-engine";
import type { PlanResult, StudentProfile } from "@/lib/domain";

const pathwaySchema = z.object({ pathwayId: z.string() });
const routeSchema = z.object({ routeId: z.string() });
const simulationSchema = z.object({ courseId: z.string() });

export function createPlanningTools(profile: StudentProfile, plan: PlanResult) {
  const handlers = {
    get_pathway_requirements: (input: z.infer<typeof pathwaySchema>) => {
      const program = programById.get(input.pathwayId);
      return program ? { pathwayId: program.id, requirements: program.requirements.map(({ id, label, courseIds }) => ({ id, label, courseIds })) } : { error: "Unsupported pathway" };
    },
    validate_route: (input: z.infer<typeof routeSchema>) => {
      const route = [...plan.routes, ...plan.rejectedCandidates].find((candidate) => candidate.id === input.routeId);
      return route ? { routeId: route.id, valid: route.valid, issues: route.issues } : { error: "Unknown route" };
    },
    read_evidence: (input: z.infer<typeof pathwaySchema>) => {
      const program = programById.get(input.pathwayId);
      const ids = new Set([...(program?.evidenceIds ?? []), "assist-review"]);
      return { evidence: [...ids].flatMap((id) => { const item = evidenceById.get(id); return item ? [{ id: item.id, title: item.title, url: item.url, effectiveYear: item.effectiveYear, status: item.status, note: item.note }] : []; }) };
    },
    simulate_course_removal: (input: z.infer<typeof simulationSchema>) => simulationEngine.removeCourse(profile, input.courseId).delta,
  };

  const tools = [
    zodResponsesFunction({ name: "get_pathway_requirements", description: "Read normalized requirements for one of Waylo's six supported pathways.", parameters: pathwaySchema }),
    zodResponsesFunction({ name: "validate_route", description: "Read the deterministic validation result for an existing route candidate.", parameters: routeSchema }),
    zodResponsesFunction({ name: "read_evidence", description: "Read source metadata for a supported pathway. This never asserts an unverified equivalency.", parameters: pathwaySchema }),
    zodResponsesFunction({ name: "simulate_course_removal", description: "Run Waylo's deterministic simulation after removing one normalized course.", parameters: simulationSchema }),
  ];

  function execute(name: string, rawArguments: string): unknown {
    const parsed = JSON.parse(rawArguments) as unknown;
    if (name === "get_pathway_requirements") return handlers.get_pathway_requirements(pathwaySchema.parse(parsed));
    if (name === "validate_route") return handlers.validate_route(routeSchema.parse(parsed));
    if (name === "read_evidence") return handlers.read_evidence(pathwaySchema.parse(parsed));
    if (name === "simulate_course_removal") return handlers.simulate_course_removal(simulationSchema.parse(parsed));
    return { error: "Unsupported tool" };
  }

  return { tools, execute };
}
