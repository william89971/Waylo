import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedResponse, ParsedResponseFunctionToolCall, ResponseInput, ResponseInputContent } from "openai/resources/responses/responses";
import type { ReasoningEffort } from "openai/resources/shared";
import { AdvisorSummarySchema, PlanCommandInterpretationSchema, TranscriptExtractionSchema, type AcademicConstraint, type AdvisorSummary, type PlanCommandInterpretation, type PlanResult, type RouteCandidate, type StudentProfile, type TranscriptExtraction } from "@/lib/domain";
import { createPlanningTools } from "@/lib/ai/planning-tools";
import { courses } from "@/lib/academic-data";
import { validateBoundedInterpretation } from "@/lib/plan-command";

export const WAYLO_MODEL = "gpt-5.6-sol" as const;
export const SDK_REASONING_EFFORT = "high" as const;
export const SDK_XHIGH_REASONING_EFFORT = "xhigh" satisfies ReasoningEffort;
export const XHIGH_SCHEMA_SUPPORTED = true as const;
export const XHIGH_LIVE_VERIFIED = false as const;

export class AIConfigurationError extends Error {
  constructor() { super("Live planning is not configured. Add OPENAI_API_KEY locally or use seeded mode."); this.name = "AIConfigurationError"; }
}

export class AIWorkflowError extends Error {
  constructor(public readonly category: "timeout" | "rate_limit" | "invalid_output" | "upstream", message: string) { super(message); this.name = "AIWorkflowError"; }
}

export type TranscriptInput = { kind: "text"; text: string } | { kind: "file"; filename: string; mimeType: string; dataBase64: string };
type ModelInput = string | ResponseInput;

function client() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIConfigurationError();
  return new OpenAI({ apiKey, timeout: 45_000, maxRetries: 2 });
}

function classify(error: unknown): AIWorkflowError {
  if (error instanceof AIWorkflowError) return error;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return new AIWorkflowError("timeout", "The live planning request timed out.");
  if (error instanceof OpenAI.RateLimitError) return new AIWorkflowError("rate_limit", "The live planning service is busy.");
  return new AIWorkflowError("upstream", "The live planning service could not complete the request.");
}

function transcriptContent(input: TranscriptInput): ModelInput {
  if (input.kind === "text") return `Extract only courses explicitly present in this transcript text. Never infer a course that is not shown.\n\n${input.text}`;
  const dataUrl = `data:${input.mimeType};base64,${input.dataBase64}`;
  const attachment: ResponseInputContent = input.mimeType.startsWith("image/")
    ? { type: "input_image", detail: "high", image_url: dataUrl }
    : { type: "input_file", filename: input.filename, file_data: dataUrl, detail: "high" };
  return [{ role: "user", content: [{ type: "input_text", text: "Extract only courses explicitly visible in this transcript. Never infer missing fields; flag them for review." }, attachment] }];
}

export interface AcademicAIProvider {
  isConfigured(): boolean;
  parsePlanCommand(command: string, selectedPathwayId: string, activeRoute?: RouteCandidate, context?: { constraints?: AcademicConstraint; selectedDestinationIds?: string[] }): Promise<PlanCommandInterpretation>;
  extractTranscript(input: TranscriptInput): Promise<TranscriptExtraction>;
  createAdvisorSummary(profile: StudentProfile, plan: PlanResult): Promise<AdvisorSummary>;
  explainPlanningSession(profile: StudentProfile, plan: PlanResult): Promise<AdvisorSummary>;
}

async function parseAdvisor(profile: StudentProfile, plan: PlanResult, useTools: boolean): Promise<AdvisorSummary> {
  const openai = client();
  const activeRoute = plan.routes[0];
  const input = `Create a concise advisor-ready summary from this normalized, deterministic state. Do not add requirements or claim admission likelihood. Profile: ${JSON.stringify({ origin: profile.originInstitutionName, selectedPathwayId: profile.selectedPathwayId, maxUnits: profile.maxUnits, summerEnrollment: profile.summerEnrollment, completedCourseIds: profile.courses.filter((course) => course.status === "completed").map((course) => course.courseId) })}. Route: ${JSON.stringify(activeRoute)}.`;
  const toolContext = createPlanningTools(profile, plan);
  let previousResponseId: string | undefined;
  let nextInput: ModelInput = input;
  for (let turn = 0; turn < (useTools ? 4 : 1); turn += 1) {
    const response: ParsedResponse<AdvisorSummary> = await openai.responses.parse({
      model: WAYLO_MODEL,
      previous_response_id: previousResponseId,
      instructions: "You are Waylo's academic planning explainer. Use only supplied normalized state and tool results. Distinguish verified facts from review items. Recommend counselor review. Never promise admission or transfer.",
      input: nextInput,
      reasoning: { effort: "medium" },
      text: { format: zodTextFormat(AdvisorSummarySchema, "waylo_advisor_summary") },
      tools: useTools ? toolContext.tools : undefined,
    });
    if (response.output_parsed) return AdvisorSummarySchema.parse(response.output_parsed);
    const calls = response.output.filter((item): item is ParsedResponseFunctionToolCall => item.type === "function_call");
    if (calls.length === 0) throw new AIWorkflowError("invalid_output", "The live response did not match the required advisor-summary schema.");
    nextInput = calls.map((call) => ({ type: "function_call_output" as const, call_id: call.call_id, output: JSON.stringify(toolContext.execute(call.name, call.arguments)) }));
    previousResponseId = response.id;
  }
  throw new AIWorkflowError("invalid_output", "The live planning session exceeded its bounded tool-call limit.");
}

export const academicAIProvider: AcademicAIProvider = {
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
  async parsePlanCommand(command, selectedPathwayId, activeRoute, context) {
    try {
      const catalog = courses.map((course) => ({ id: course.id, code: course.code, title: course.title }));
      const response = await client().responses.parse({
        model: WAYLO_MODEL,
        instructions: "Normalize a planning request into only the allowed bounded changes. Never invent a course, pathway, destination, or requirement ID and never edit a plan. A named course term must match the supplied active route or produce a clarification. Weekly work hours are advisory; max units are hard. 'Remove' means defer the named course outside its current route position. The deterministic engine decides all scheduling and validation.",
        input: JSON.stringify({ command, selectedPathwayId, activeRoute: activeRoute ? { id: activeRoute.id, terms: activeRoute.terms.map((term) => ({ label: term.label, courseIds: term.courses.map((course) => course.courseId) })) } : null, constraints: context?.constraints, selectedDestinationIds: context?.selectedDestinationIds, boundedCourseCatalog: catalog, boundedPathways: ["berkeley-cogsci", "berkeley-data", "ucla-cogsci", "ucla-data", "ucsd-cogsci", "ucsd-data"], boundedDestinations: ["berkeley", "ucla", "ucsd"], allowedChanges: ["defer_course", "restore_course", "replace_course", "set_summer_enrollment", "set_summer_limit", "set_max_units", "set_transfer_target", "set_pathway", "add_destination", "remove_destination", "set_weekly_work_hours"] }),
        reasoning: { effort: SDK_REASONING_EFFORT },
        text: { format: zodTextFormat(PlanCommandInterpretationSchema, "waylo_plan_command") },
      });
      if (!response.output_parsed) throw new AIWorkflowError("invalid_output", "The live command response did not match the required schema.");
      return validateBoundedInterpretation(PlanCommandInterpretationSchema.parse({ ...response.output_parsed, source: "live" }));
    } catch (error) { if (error instanceof AIConfigurationError) throw error; throw classify(error); }
  },
  async extractTranscript(input) {
    try {
      const response = await client().responses.parse({
        model: WAYLO_MODEL,
        instructions: "Extract a transcript into the strict schema. Preserve source codes and titles. Use null when a normalized College of the Canyons course identity is not supported by the provided text or image. Low confidence or uncertain matches must set reviewRequired=true. Do not calculate a route.",
        input: transcriptContent(input),
        reasoning: { effort: SDK_REASONING_EFFORT },
        text: { format: zodTextFormat(TranscriptExtractionSchema, "waylo_transcript_extraction") },
      });
      if (!response.output_parsed) throw new AIWorkflowError("invalid_output", "The live transcript response did not match the required schema.");
      return TranscriptExtractionSchema.parse(response.output_parsed);
    } catch (error) { if (error instanceof AIConfigurationError) throw error; throw classify(error); }
  },
  async createAdvisorSummary(profile, plan) {
    try { return await parseAdvisor(profile, plan, false); } catch (error) { if (error instanceof AIConfigurationError) throw error; throw classify(error); }
  },
  async explainPlanningSession(profile, plan) {
    try { return await parseAdvisor(profile, plan, true); } catch (error) { if (error instanceof AIConfigurationError) throw error; throw classify(error); }
  },
};
