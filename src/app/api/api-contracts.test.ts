import { afterEach, describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { POST as extract } from "@/app/api/transcripts/extract/route";
import { POST as advisor } from "@/app/api/advisor-summary/route";
import { POST as planning } from "@/app/api/planning-sessions/route";
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

  it("returns a safe missing-key response for live extraction", async () => {
    delete process.env.OPENAI_API_KEY;
    const request = new Request("http://localhost/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "live", text: "MATH 211 Calculus I" }) });
    const response = await extract(request); const body = await response.json();
    expect(response.status).toBe(503); expect(body.error).toBe("missing_key"); expect(body.seededModeAvailable).toBe(true);
  });

  it("builds advisor summary only from validated normalized state", async () => {
    const request = new Request("http://localhost/api/advisor-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", profile: seedProfile, plan }) });
    const response = await advisor(request); const body = await response.json();
    expect(response.status).toBe(200); expect(body.summary.disclaimer).toContain("not an admission or transfer guarantee");
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
