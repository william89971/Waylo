import { randomUUID } from "node:crypto";
import { AuthenticationError } from "@/lib/server/auth";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiFailure(error: unknown, requestId = randomUUID()) {
  const failure = error instanceof ApiError
    ? error
    : error instanceof AuthenticationError
      ? new ApiError("unauthorized", error.message, 401)
      : new ApiError("internal_error", "Waylo could not complete this request.", 500, true);
  return Response.json({ error: { code: failure.code, message: failure.message, requestId, retryable: failure.retryable } }, {
    status: failure.status,
    headers: { "Cache-Control": "no-store", "X-Waylo-Request-Id": requestId },
  });
}
