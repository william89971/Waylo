import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const APPROVED_LIVE_WORKFLOW = "waylo-academic-twin-demo-v1" as const;
export const DEMO_SESSION_TTL_SECONDS = 15 * 60;
export const MAX_RESPONSES_PER_SESSION = 6;
export const MAX_CONCURRENT_LIVE_REQUESTS = 1;
export const MAX_PUBLIC_PLANNING_TURNS = 2;

export type LiveEndpoint = "command" | "transcript" | "planning";
export type DemoMode = "seeded" | "live";

const SESSION_COOKIE = "waylo_demo_session";
const ENDPOINT_LIMITS: Record<LiveEndpoint, number> = { command: 2, transcript: 1, planning: 1 };

interface DemoTokenPayload {
  version: 1;
  sessionId: string;
  workflow: typeof APPROVED_LIVE_WORKFLOW;
  issuedAt: number;
  expiresAt: number;
}

interface DemoSessionState {
  expiresAt: number;
  activeRequests: number;
  responseCreations: number;
  endpointCalls: Record<LiveEndpoint, number>;
}

const sessions = new Map<string, DemoSessionState>();

export class LiveDemoError extends Error {
  constructor(
    public readonly code:
      | "live_mode_disabled"
      | "live_session_required"
      | "live_session_invalid"
      | "live_session_expired"
      | "live_session_state_missing"
      | "live_workflow_limit"
      | "live_concurrency_limit"
      | "live_response_budget_exhausted"
      | "live_demo_configuration",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LiveDemoError";
  }
}

export interface LiveAIRequestContext {
  requestId: string;
  sessionId: string;
  safetyIdentifier: string;
  recordResponseCreation(): void;
}

export interface LiveRequestLease {
  context: LiveAIRequestContext;
  release(): void;
}

function signingSecret() {
  const secret = process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new LiveDemoError("live_demo_configuration", "Live demo signing is not configured.", 503);
  }
  return secret;
}

function accessCode() {
  const code = process.env.WAYLO_LIVE_DEMO_ACCESS_CODE;
  if (!code || code.length < 16) {
    throw new LiveDemoError("live_demo_configuration", "Live demo access is not configured.", 503);
  }
  return code;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

function encodeToken(payload: DemoTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeToken(token: string): DemoTokenPayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !secureEqual(signature, sign(encoded))) {
    throw new LiveDemoError("live_session_invalid", "The live demo session is invalid.", 401);
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as DemoTokenPayload;
    if (payload.version !== 1 || payload.workflow !== APPROVED_LIVE_WORKFLOW || !payload.sessionId || !Number.isInteger(payload.expiresAt)) throw new Error("invalid");
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) throw new LiveDemoError("live_session_expired", "The live demo session has expired.", 401);
    return payload;
  } catch (error) {
    if (error instanceof LiveDemoError) throw error;
    throw new LiveDemoError("live_session_invalid", "The live demo session is invalid.", 401);
  }
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const item of cookie.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=");
  }
  return undefined;
}

function cleanupExpiredSessions() {
  const now = Math.floor(Date.now() / 1000);
  for (const [sessionId, state] of sessions) if (state.expiresAt <= now) sessions.delete(sessionId);
}

export function getDemoMode(): DemoMode {
  return process.env.WAYLO_DEMO_MODE === "live" ? "live" : "seeded";
}

export function isLiveAIConfigured() {
  return getDemoMode() === "live"
    && Boolean(process.env.OPENAI_API_KEY)
    && Boolean(process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET && process.env.WAYLO_LIVE_DEMO_SIGNING_SECRET.length >= 32)
    && Boolean(process.env.WAYLO_LIVE_DEMO_ACCESS_CODE && process.env.WAYLO_LIVE_DEMO_ACCESS_CODE.length >= 16);
}

export function issueDemoSession(providedAccessCode: string) {
  if (getDemoMode() !== "live") throw new LiveDemoError("live_mode_disabled", "This deployment is seeded-only.", 503);
  if (!secureEqual(providedAccessCode, accessCode())) throw new LiveDemoError("live_session_invalid", "The live demo access code is invalid.", 401);
  cleanupExpiredSessions();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: DemoTokenPayload = {
    version: 1,
    sessionId: randomUUID(),
    workflow: APPROVED_LIVE_WORKFLOW,
    issuedAt,
    expiresAt: issuedAt + DEMO_SESSION_TTL_SECONDS,
  };
  sessions.set(payload.sessionId, {
    expiresAt: payload.expiresAt,
    activeRequests: 0,
    responseCreations: 0,
    endpointCalls: { command: 0, transcript: 0, planning: 0 },
  });
  const token = encodeToken(payload);
  return {
    sessionId: payload.sessionId,
    expiresAt: new Date(payload.expiresAt * 1000).toISOString(),
    cookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DEMO_SESSION_TTL_SECONDS}`,
  };
}

export function beginLiveRequest(request: Request, endpoint: LiveEndpoint, requestId: string): LiveRequestLease {
  if (getDemoMode() !== "live") throw new LiveDemoError("live_mode_disabled", "This deployment is seeded-only.", 503);
  const token = cookieValue(request);
  if (!token) throw new LiveDemoError("live_session_required", "A signed live demo session is required.", 401);
  cleanupExpiredSessions();
  const payload = decodeToken(token);
  const state = sessions.get(payload.sessionId);
  if (!state) throw new LiveDemoError("live_session_state_missing", "The live demo session is not active on this server.", 401);
  if (state.activeRequests >= MAX_CONCURRENT_LIVE_REQUESTS) throw new LiveDemoError("live_concurrency_limit", "Only one live request may run in this demo session.", 429);
  if (state.endpointCalls[endpoint] >= ENDPOINT_LIMITS[endpoint]) throw new LiveDemoError("live_workflow_limit", "This live demo workflow step has reached its session limit.", 429);
  if (state.responseCreations >= MAX_RESPONSES_PER_SESSION) throw new LiveDemoError("live_response_budget_exhausted", "This live demo session has reached its response budget.", 429);

  state.activeRequests += 1;
  state.endpointCalls[endpoint] += 1;
  let released = false;
  return {
    context: {
      requestId,
      sessionId: payload.sessionId,
      safetyIdentifier: payload.sessionId,
      recordResponseCreation() {
        if (state.responseCreations >= MAX_RESPONSES_PER_SESSION) {
          throw new LiveDemoError("live_response_budget_exhausted", "This live demo session has reached its response budget.", 429);
        }
        state.responseCreations += 1;
      },
    },
    release() {
      if (released) return;
      released = true;
      state.activeRequests = Math.max(0, state.activeRequests - 1);
    },
  };
}

export function resetLiveDemoStateForTests() {
  sessions.clear();
}
