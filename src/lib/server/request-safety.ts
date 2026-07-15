import { randomUUID } from "node:crypto";
import type { z } from "zod";

export const JSON_REQUEST_MAX_BYTES = 256 * 1024;
export const TRANSCRIPT_MULTIPART_MAX_BYTES = (2 * 1024 * 1024) + (256 * 1024);

export class RequestSafetyError extends Error {
  constructor(
    public readonly code: "request_too_large" | "invalid_json",
    message: string,
    public readonly status = code === "request_too_large" ? 413 : 400,
  ) {
    super(message);
    this.name = "RequestSafetyError";
  }
}

async function readBoundedBytes(request: Request, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestSafetyError("request_too_large", `Request bodies are limited to ${maximumBytes} bytes.`);
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new RequestSafetyError("request_too_large", `Request bodies are limited to ${maximumBytes} bytes.`);
    }
    chunks.push(value);
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export async function readLimitedJson<TSchema extends z.ZodType>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  const bytes = await readBoundedBytes(request, JSON_REQUEST_MAX_BYTES);
  try {
    return schema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof RequestSafetyError) throw error;
    throw new RequestSafetyError("invalid_json", "The request body is not valid for this endpoint.");
  }
}

export async function readLimitedFormData(request: Request): Promise<FormData> {
  const bytes = await readBoundedBytes(request, TRANSCRIPT_MULTIPART_MAX_BYTES);
  const boundedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: bytes.slice().buffer as ArrayBuffer,
  });
  try {
    return await boundedRequest.formData();
  } catch {
    throw new RequestSafetyError("invalid_json", "The multipart request could not be read.");
  }
}

export function createRequestId() {
  return randomUUID();
}

export interface SanitizedRequestLog {
  requestId: string;
  endpoint: "demo-session" | "command" | "transcript" | "planning" | "advisor";
  mode: "seeded" | "live";
  outcome: "accepted" | "rejected" | "fallback" | "complete";
  category?: string;
  durationMs: number;
}

type LogSink = (record: SanitizedRequestLog) => void;
let logSink: LogSink = (record) => console.info("waylo_request", record);

export function logSanitizedRequest(input: SanitizedRequestLog) {
  const record: SanitizedRequestLog = {
    requestId: input.requestId,
    endpoint: input.endpoint,
    mode: input.mode,
    outcome: input.outcome,
    category: input.category,
    durationMs: Math.max(0, Math.round(input.durationMs)),
  };
  logSink(record);
}

export function setRequestLogSinkForTests(sink?: LogSink) {
  logSink = sink ?? ((record) => console.info("waylo_request", record));
}

export function jsonWithRequestId(body: unknown, requestId: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Waylo-Request-Id", requestId);
  return Response.json(body, { ...init, headers });
}
