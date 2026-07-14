import { describe, expect, it } from "vitest";
import { createPlanningTools } from "@/lib/ai/planning-tools";
import { WAYLO_MODEL, XHIGH_LIVE_VERIFIED, XHIGH_SCHEMA_SUPPORTED } from "@/lib/ai/provider";
import { seededAdvisorSummary, seededTranscriptExtraction } from "@/lib/fixtures";
import { AdvisorSummarySchema, TranscriptExtractionSchema, WayloWorkspaceV1Schema } from "@/lib/domain";
import { planningEngine } from "@/lib/planning-engine";
import { createPlanningEvents } from "@/lib/planning-events";
import { seedProfile } from "@/lib/academic-data";
import { migrateWorkspace } from "@/lib/workspace-repository";

describe("structured contracts", () => {
  const plan = planningEngine.buildPlan(seedProfile);
  const workspace = { version: 1 as const, profile: seedProfile, plan, activeRouteId: plan.routes[0].id, simulation: undefined, planningEvents: createPlanningEvents(plan), mode: "seeded" as const };

  it("revalidates recorded fixtures", () => {
    expect(TranscriptExtractionSchema.parse(seededTranscriptExtraction).courses.length).toBeGreaterThan(0);
    expect(AdvisorSummarySchema.parse(seededAdvisorSummary).disclaimer).toContain("not an admission guarantee");
  });

  it("exposes strict read-only planning function tools", () => {
    const { tools, execute } = createPlanningTools(seedProfile, plan);
    expect(tools).toHaveLength(4);
    expect(tools.every((tool) => tool.strict === true)).toBe(true);
    expect(execute("validate_route", JSON.stringify({ routeId: plan.routes[0].id }))).toMatchObject({ valid: true });
  });

  it("pins GPT-5.6 Sol and keeps xhigh disabled pending a live request", () => {
    expect(WAYLO_MODEL).toBe("gpt-5.6-sol");
    expect(XHIGH_SCHEMA_SUPPORTED).toBe(true);
    expect(XHIGH_LIVE_VERIFIED).toBe(false);
  });

  it("accepts V1 workspaces and rejects raw transcript persistence", () => {
    expect(migrateWorkspace(workspace)).toBeDefined();
    expect(WayloWorkspaceV1Schema.safeParse({ ...workspace, rawTranscript: "sensitive" }).success).toBe(false);
    expect(migrateWorkspace({ ...workspace, version: 2 })).toBeUndefined();
  });
});
