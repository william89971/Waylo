import { z } from "zod";
import { APPROVED_LIVE_WORKFLOW, issueDemoSession, LiveDemoError } from "@/lib/ai/live-demo";
import { createRequestId, jsonWithRequestId, logSanitizedRequest, readLimitedJson, RequestSafetyError } from "@/lib/server/request-safety";

export const runtime = "nodejs";

const RequestSchema = z.object({
  workflow: z.literal(APPROVED_LIVE_WORKFLOW),
  accessCode: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  try {
    const body = await readLimitedJson(request, RequestSchema);
    const session = issueDemoSession(body.accessCode);
    logSanitizedRequest({ requestId, endpoint: "demo-session", mode: "live", outcome: "accepted", durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ workflow: APPROVED_LIVE_WORKFLOW, expiresAt: session.expiresAt }, requestId, { status: 201, headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    const status = error instanceof LiveDemoError || error instanceof RequestSafetyError ? error.status : 400;
    const code = error instanceof LiveDemoError || error instanceof RequestSafetyError ? error.code : "invalid_request";
    logSanitizedRequest({ requestId, endpoint: "demo-session", mode: "live", outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ error: code, message: "A protected live demo session could not be created." }, requestId, { status });
  }
}
