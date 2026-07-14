import { afterEach, describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { POST as extract } from "@/app/api/transcripts/extract/route";
import { POST as advisor } from "@/app/api/advisor-summary/route";
import { POST as planning } from "@/app/api/planning-sessions/route";
import { POST as parseCommand } from "@/app/api/plan-commands/parse/route";
import { GET as judgeSnapshot } from "@/app/api/judge-snapshot/route";
import { POST as compareRequirements } from "@/app/api/requirement-changes/compare/route";
import { seedProfile } from "@/lib/academic-data";
import { planningEngine } from "@/lib/planning-engine";

const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });

describe("API contracts", () => {
  const plan = planningEngine.buildPlan(seedProfile);

  it("reports configuration state without values", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await health(); const body = await response.json();
    expect(body.aiConfigured).toBe(false);
    expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
  });

  it("returns a validated seeded transcript extraction", async () => {
    const request = new Request("http://localhost/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", text: "sample" }) });
    const response = await extract(request); const body = await response.json();
    expect(response.status).toBe(200); expect(body.mode).toBe("seeded"); expect(body.extraction.reviewFlags.length).toBeGreaterThan(0);
  });

  it("streams transcript progress and ends with a structured result", async () => {
    const request = new Request("http://localhost/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ mode: "seeded", text: "sample" }) });
    const response = await extract(request); const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.map((event) => event.stage).filter(Boolean)).toEqual(expect.arrayContaining(["reading_document", "extracting_courses", "flagging_uncertain_text", "matching_known_courses", "reviewing_with_student"]));
    expect(events.at(-1).type).toBe("result");
  });

  it("parses bounded seeded commands and safely rejects missing-key live parsing", async () => {
    const seededRequest = new Request("http://localhost/api/plan-commands/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", command: "Remove Linear Algebra and use summer classes", selectedPathwayId: "ucla-data" }) });
    const seededResponse = await parseCommand(seededRequest); const seededBody = await seededResponse.json();
    expect(seededBody.changes.some((change: { courseId?: string }) => change.courseId === "coc-math-214")).toBe(true);
    delete process.env.OPENAI_API_KEY;
    const liveRequest = new Request("http://localhost/api/plan-commands/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "live", command: "Remove Linear Algebra", selectedPathwayId: "ucla-data" }) });
    const liveResponse = await parseCommand(liveRequest); const liveBody = await liveResponse.json();
    expect(liveResponse.status).toBe(503); expect(liveBody.seededModeAvailable).toBe(true);
  });

  it("returns a safe missing-key response for live extraction", async () => {
    delete process.env.OPENAI_API_KEY;
    const request = new Request("http://localhost/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "live", text: "MATH 211 Calculus I" }) });
    const response = await extract(request); const body = await response.json();
    expect(response.status).toBe(503); expect(body.error).toBe("missing_key"); expect(body.seededModeAvailable).toBe(true);
  });

  it("builds advisor summary only from validated normalized state", async () => {
    const request = new Request("http://localhost/api/advisor-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", profile: seedProfile, plan }) });
    const response = await advisor(request); const body = await response.json();
    expect(response.status).toBe(200); expect(body.packet.disclaimer).toContain("not an admission or transfer guarantee");
  });

  it("returns a sanitized judge snapshot with explicit build attestation", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await judgeSnapshot(); const body = await response.json();
    expect(body.execution.label).toBe("Recorded GPT-5.6 demo result.");
    expect(body.build.label).toBe("Not verified for this build.");
    expect(JSON.stringify(body)).not.toContain("OPENAI_API_KEY");
  });

  it("returns only a clearly labeled controlled requirement comparison", async () => {
    const request = new Request("http://localhost/api/requirement-changes/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathwayId: seedProfile.selectedPathwayId, activeRoute: plan.routes[0] }) });
    const response = await compareRequirements(request); const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("controlled-fixture");
    expect(body.changes[0].status).toBe("proposed");
    expect(body.disclaimer).toContain("not a real catalog");
  });

  it("streams discriminated planning events and a safe live fallback", async () => {
    delete process.env.OPENAI_API_KEY;
    const request = new Request("http://localhost/api/planning-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "live", profile: seedProfile, plan }) });
    const response = await planning(request); const text = await response.text(); const events = text.trim().split("\n").map((line) => JSON.parse(line));
    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(events.some((event) => event.status === "rejected")).toBe(true);
    expect(events.at(-1).label).toBe("Live explanation unavailable");
  });
});
