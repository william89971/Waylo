import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { POST as advisor } from "@/app/api/advisor-summary/route";
import { POST as createDemoSession } from "@/app/api/demo-sessions/route";
import { POST as parseCommand } from "@/app/api/plan-commands/parse/route";
import { POST as planning } from "@/app/api/planning-sessions/route";
import { POST as extract } from "@/app/api/transcripts/extract/route";
import { academicAIProvider, AIWorkflowError, buildStructuredOutputFormats, OPENAI_SDK_MAX_RETRIES, OUTPUT_TOKEN_CEILINGS } from "@/lib/ai/provider";
import { beginLiveRequest, issueDemoSession, LiveDemoError, MAX_PUBLIC_PLANNING_TURNS, MAX_RESPONSES_PER_SESSION, resetLiveDemoStateForTests } from "@/lib/ai/live-demo";
import { JSON_REQUEST_MAX_BYTES, logSanitizedRequest, readLimitedJson, setRequestLogSinkForTests } from "@/lib/server/request-safety";
import { TRANSCRIPT_FILE_MAX_BYTES, TRANSCRIPT_IMAGE_MAX_PIXELS, TRANSCRIPT_PDF_MAX_PAGES, TRANSCRIPT_TEXT_MAX_CHARACTERS, validateTranscriptFile, validateTranscriptText } from "@/lib/server/transcript-limits";

const environment = {
  mode: process.env.WAYLO_DEMO_MODE,
  secret: process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET,
  code: process.env.WAYLO_LIVE_DEMO_ACCESS_CODE,
  key: process.env.OPENAI_API_KEY,
};

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function enableProtectedLiveMode() {
  process.env.WAYLO_DEMO_MODE = "live";
  process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET = "test-signing-secret-which-is-at-least-32-characters";
  process.env.WAYLO_LIVE_DEMO_ACCESS_CODE = "test-access-code-not-a-credential";
  const session = issueDemoSession(process.env.WAYLO_LIVE_DEMO_ACCESS_CODE);
  return session.cookie.split(";")[0];
}

function commandRequest(mode: "seeded" | "live", cookie?: string, command = "Remove Linear Algebra") {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookie) headers.set("Cookie", cookie);
  return new Request("http://localhost/api/plan-commands/parse", {
    method: "POST",
    headers,
    body: JSON.stringify({ mode, command, selectedPathwayId: "ucla-data" }),
  });
}

beforeEach(() => {
  delete process.env.WAYLO_DEMO_MODE;
  delete process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET;
  delete process.env.WAYLO_LIVE_DEMO_ACCESS_CODE;
  delete process.env.OPENAI_API_KEY;
  resetLiveDemoStateForTests();
});

afterEach(() => {
  restore("WAYLO_DEMO_MODE", environment.mode);
  restore("WAYLO_LIVE_DEMO_SIGNING_SECRET", environment.secret);
  restore("WAYLO_LIVE_DEMO_ACCESS_CODE", environment.code);
  restore("OPENAI_API_KEY", environment.key);
  resetLiveDemoStateForTests();
  setRequestLogSinkForTests();
  vi.restoreAllMocks();
});

describe("live-mode hardening", () => {
  it("constructs every strict Structured Outputs format before a network request", () => {
    expect(() => buildStructuredOutputFormats()).not.toThrow();
    const formats = buildStructuredOutputFormats();
    expect(formats.planCommand.type).toBe("json_schema");
    expect(formats.planCommand.strict).toBe(true);
  });

  it("keeps seeded command, transcript, and planning flows free of provider calls", async () => {
    const commandSpy = vi.spyOn(academicAIProvider, "parsePlanCommand");
    const transcriptSpy = vi.spyOn(academicAIProvider, "extractTranscript");
    const planningSpy = vi.spyOn(academicAIProvider, "explainPlanningSession");

    expect((await parseCommand(commandRequest("seeded"))).status).toBe(200);
    const transcriptRequest = new Request("http://localhost/api/transcripts/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", text: "MATH 211" }) });
    expect((await extract(transcriptRequest)).status).toBe(200);
    const planningRequest = new Request("http://localhost/api/planning-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seeded", pathwayId: "ucla-data" }) });
    const planningResponse = await planning(planningRequest);
    await planningResponse.text();

    expect(commandSpy).not.toHaveBeenCalled();
    expect(transcriptSpy).not.toHaveBeenCalled();
    expect(planningSpy).not.toHaveBeenCalled();
  });

  it("rejects live requests while WAYLO_DEMO_MODE is absent or seeded", async () => {
    const provider = vi.spyOn(academicAIProvider, "parsePlanCommand");
    const response = await parseCommand(commandRequest("live"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error).toBe("live_mode_disabled");
    expect(provider).not.toHaveBeenCalled();
  });

  it("requires a signed session even when live mode is explicitly enabled", async () => {
    process.env.WAYLO_DEMO_MODE = "live";
    const response = await parseCommand(commandRequest("live"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "live_session_required" });
  });

  it("issues only a short-lived HttpOnly signed cookie for the approved workflow", async () => {
    process.env.WAYLO_DEMO_MODE = "live";
    process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET = "test-signing-secret-which-is-at-least-32-characters";
    process.env.WAYLO_LIVE_DEMO_ACCESS_CODE = "test-access-code-not-a-credential";
    const request = new Request("http://localhost/api/demo-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow: "waylo-academic-twin-demo-v1", accessCode: process.env.WAYLO_LIVE_DEMO_ACCESS_CODE }),
    });
    const response = await createDemoSession(request);
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(response.status).toBe(201);
    expect(cookie).toContain("Max-Age=900");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(await response.json()).not.toHaveProperty("sessionId");
  });

  it("enforces one concurrent request, endpoint workflow limits, and six response creations", () => {
    const cookie = enableProtectedLiveMode();
    const request = new Request("http://localhost", { headers: { Cookie: cookie } });
    const lease = beginLiveRequest(request, "command", "request-1");
    expect(() => beginLiveRequest(request, "command", "request-2")).toThrowError(LiveDemoError);
    for (let index = 0; index < MAX_RESPONSES_PER_SESSION; index += 1) lease.context.recordResponseCreation();
    expect(() => lease.context.recordResponseCreation()).toThrowError(expect.objectContaining({ code: "live_response_budget_exhausted" }));
    lease.release();
    expect(() => beginLiveRequest(request, "command", "request-3")).toThrowError(expect.objectContaining({ code: "live_response_budget_exhausted" }));
  });

  it("restricts a signed session to the approved endpoint workflow", () => {
    const cookie = enableProtectedLiveMode();
    const request = new Request("http://localhost", { headers: { Cookie: cookie } });
    const transcriptLease = beginLiveRequest(request, "transcript", "request-1");
    transcriptLease.release();
    expect(() => beginLiveRequest(request, "transcript", "request-2")).toThrowError(expect.objectContaining({ code: "live_workflow_limit" }));

    const [name, token] = cookie.split("=");
    const tampered = `${name}=${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(() => beginLiveRequest(new Request("http://localhost", { headers: { Cookie: tampered } }), "planning", "request-3")).toThrowError(expect.objectContaining({ code: "live_session_invalid" }));
  });

  it("uses bounded retries, output ceilings, and planning turns", () => {
    expect(OPENAI_SDK_MAX_RETRIES).toBeLessThanOrEqual(1);
    expect(OUTPUT_TOKEN_CEILINGS).toEqual({ command: 3_000, transcript: 6_000, planning: 4_000 });
    expect(MAX_PUBLIC_PLANNING_TURNS).toBe(2);
  });

  it("enforces command, transcript, JSON, image, PDF, and file limits", async () => {
    expect((await parseCommand(commandRequest("seeded", undefined, "x".repeat(301)))).status).toBe(400);
    expect(() => validateTranscriptText("x".repeat(TRANSCRIPT_TEXT_MAX_CHARACTERS + 1))).toThrow();
    expect(() => validateTranscriptFile(new Uint8Array(TRANSCRIPT_FILE_MAX_BYTES + 1), "application/pdf")).toThrow();

    const png = new Uint8Array(24);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(png.buffer).setUint32(16, Math.ceil(Math.sqrt(TRANSCRIPT_IMAGE_MAX_PIXELS + 1)));
    new DataView(png.buffer).setUint32(20, Math.ceil(Math.sqrt(TRANSCRIPT_IMAGE_MAX_PIXELS + 1)));
    expect(() => validateTranscriptFile(png, "image/png")).toThrowError(expect.objectContaining({ code: "image_pixel_limit" }));

    const pages = Array.from({ length: TRANSCRIPT_PDF_MAX_PAGES + 1 }, (_, index) => `${index + 1} 0 obj <</Type /Page>> endobj`).join("\n");
    expect(() => validateTranscriptFile(new TextEncoder().encode(`%PDF-1.4\n${pages}`), "application/pdf")).toThrowError(expect.objectContaining({ code: "pdf_page_limit" }));
    const allowedPages = Array.from({ length: TRANSCRIPT_PDF_MAX_PAGES }, (_, index) => `${index + 1} 0 obj <</Type /Page>> endobj`).join("\n");
    expect(validateTranscriptFile(new TextEncoder().encode(`%PDF-1.4\n${allowedPages}`), "application/pdf")).toMatchObject({ kind: "pdf", pages: 2 });

    const boundedPng = new Uint8Array(24);
    boundedPng.set([137, 80, 78, 71, 13, 10, 26, 10]);
    new DataView(boundedPng.buffer).setUint32(16, 1);
    new DataView(boundedPng.buffer).setUint32(20, 1);
    const form = new FormData();
    form.set("mode", "seeded");
    form.append("file", new File([boundedPng], "one.png", { type: "image/png" }));
    form.append("file", new File([boundedPng], "two.png", { type: "image/png" }));
    const multipleFiles = await extract(new Request("http://localhost/api/transcripts/extract", { method: "POST", body: form }));
    expect(multipleFiles.status).toBe(400);
    await expect(multipleFiles.json()).resolves.toMatchObject({ error: "transcript_file_count" });

    const schema = z.object({ value: z.string() });
    const largeRequest = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(JSON_REQUEST_MAX_BYTES) }) });
    await expect(readLimitedJson(largeRequest, schema)).rejects.toMatchObject({ code: "request_too_large", status: 413 });
  });

  it("disables the public live advisor endpoint", async () => {
    const response = await advisor(new Request("http://localhost/api/advisor-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "live", pathwayId: "ucla-data" }) }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "live_advisor_disabled", seededModeAvailable: true });
  });

  it.each(["timeout", "rate_limit", "invalid_output", "budget", "upstream"] as const)("falls back immediately after a protected live %s failure", async (category) => {
    const cookie = enableProtectedLiveMode();
    vi.spyOn(academicAIProvider, "parsePlanCommand").mockRejectedValue(new AIWorkflowError(category, "sanitized failure"));
    const response = await parseCommand(commandRequest("live", cookie));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Waylo-Fallback")).toBe(category);
    expect(body.source).toBe("seeded");
  });

  it("falls back without a network request when a protected live session has no API configuration", async () => {
    const cookie = enableProtectedLiveMode();
    delete process.env.OPENAI_API_KEY;
    const response = await parseCommand(commandRequest("live", cookie));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Waylo-Fallback")).toBe("unavailable");
    expect(body.source).toBe("seeded");
  });

  it("logs only allowlisted operational metadata", () => {
    const records: unknown[] = [];
    setRequestLogSinkForTests((record) => records.push(record));
    logSanitizedRequest({ requestId: "safe-id", endpoint: "transcript", mode: "live", outcome: "rejected", category: "timeout", durationMs: 12, transcript: "sensitive transcript", credential: "secret" } as never);
    const serialized = JSON.stringify(records);
    expect(serialized).toContain("safe-id");
    expect(serialized).not.toContain("sensitive transcript");
    expect(serialized).not.toContain("secret");
  });
});
